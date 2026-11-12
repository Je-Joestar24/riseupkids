/**
 * The printable of an experience can be a LINK or an UPLOADED FILE (a PDF or Word document), never both: creating,
 * replacing, removing, switching between the two, what is deleted from storage and when, and every refusal. Real
 * in-memory MongoDB; only storage (S3) is faked.
 */
const mongoose = require('mongoose');

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

const s3 = require('../services/s3.service');
const Experience = require('../models/Experience');
const service = require('../services/experienceAdmin.service');
const { ExperienceError, sanitizeFileName } = require('../utils/experienceValidation.util');

jest.setTimeout(60000);

const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const video = (title, embedUrl) => ({ title, embedUrl });
const USER = new mongoose.Types.ObjectId();
const LINK = 'https://riseup.kids/downloads/recipe.pdf';

let mongod;
let counter;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
});

beforeEach(async () => {
  await Experience.deleteMany({});
  jest.restoreAllMocks();
  jest.clearAllMocks();
  counter = 0;
  // The folder is part of the address, so a test can tell a file from a picture.
  s3.uploadFileFromMulter.mockImplementation(async (file, folder) => ({ url: `https://cdn.test/${folder}/${++counter}-${file.originalname}` }));
  s3.getS3KeyFromUrl.mockImplementation((url) => (String(url).startsWith('https://cdn.test/') ? String(url).slice(17) : null));
  s3.deleteByKey.mockResolvedValue(undefined);
});

const pdf = (name = 'Recipe.pdf') => ({ originalname: name, mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4 x') });
const picture = (name = 'pic.png') => ({ originalname: name, mimetype: 'image/png', buffer: Buffer.from('x') });

const make = (overrides = {}, context = {}) =>
  service.createExperience({ title: 'Smoothie', videos: [video('Words', V1)], ...overrides }, { userId: USER, ...context });

async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ExperienceError);
    return error;
  }
  throw new Error('expected an ExperienceError but nothing was thrown');
}

describe('creating with a printable file', () => {
  it('stores the file in its own folder, and keeps its address and its name', async () => {
    const created = await make({}, { files: { printableFile: pdf('Strawberry Recipe.pdf') } });
    expect(created.printable.file).toBe('https://cdn.test/experiences/files/1-Strawberry Recipe.pdf');
    expect(created.printable.fileName).toBe('Strawberry Recipe.pdf');
    expect(created.printable.link).toBe('');
    expect(s3.uploadFileFromMulter).toHaveBeenCalledWith(expect.objectContaining({ originalname: 'Strawberry Recipe.pdf' }), 'experiences/files');
  });

  it('what is stored in the database is what is returned', async () => {
    const created = await make({}, { files: { printableFile: pdf('a.pdf') } });
    const stored = await Experience.findOne({ uuid: created.uuid }).lean();
    expect(stored.printable.file).toBe(created.printable.file);
    expect(stored.printable.fileName).toBe('a.pdf');
  });

  it('cleans the name it keeps (no folders, no odd characters)', async () => {
    const created = await make({}, { files: { printableFile: pdf('C:\\Users\\me\\Documents\\recipe.pdf') } });
    expect(created.printable.fileName).toBe('recipe.pdf');
  });

  it('can come with a picture and a button text', async () => {
    const created = await make({ printable: { button: 'Print recipe' } }, { files: { printableFile: pdf(), printableImage: picture() } });
    expect(created.printable).toMatchObject({ button: 'Print recipe', fileName: 'Recipe.pdf' });
    expect(created.printable.image).toMatch(/experiences\/images\//);
    expect(created.printable.file).toMatch(/experiences\/files\//);
  });

  it('an experience with a link has no file, and one with neither has neither', async () => {
    const withLink = await make({ printable: { link: LINK } });
    expect(withLink.printable).toMatchObject({ link: LINK, file: null, fileName: '' });
    const none = await make();
    expect(none.printable).toMatchObject({ link: '', file: null, fileName: '' });
  });

  it('refuses a link AND a file together, names the link, and stores nothing', async () => {
    const error = await failure(make({ printable: { link: LINK } }, { files: { printableFile: pdf() } }));
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(error.errors).toEqual([{ field: 'printable.link', message: 'Choose a link or a file for the printable, not both.' }]);
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('an empty link with a file is fine', async () => {
    const created = await make({ printable: { link: '', button: 'Print' } }, { files: { printableFile: pdf() } });
    expect(created.printable.file).toBeTruthy();
  });

  it('answers 502 when the file cannot be stored, without leaking the reason, and saves nothing', async () => {
    s3.uploadFileFromMulter.mockRejectedValueOnce(new Error('S3 is down: secret-key-detail'));
    const error = await failure(make({}, { files: { printableFile: pdf() } }));
    expect(error).toMatchObject({ statusCode: 502, code: 'IMAGE_UPLOAD_FAILED', message: 'We could not save the file. Please try again.' });
    expect(error.message).not.toMatch(/secret|S3/);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('removes the pictures already stored when the file cannot be stored', async () => {
    s3.uploadFileFromMulter.mockResolvedValueOnce({ url: 'https://cdn.test/experiences/images/first.png' }).mockRejectedValueOnce(new Error('boom'));
    await failure(make({}, { files: { printableImage: picture(), printableFile: pdf() } }));
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/first.png');
  });

  it('removes the stored file when the database save fails', async () => {
    jest.spyOn(Experience, 'create').mockRejectedValueOnce(new Error('db down'));
    await expect(make({}, { files: { printableFile: pdf() } })).rejects.toThrow('db down');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Recipe.pdf');
  });
});

describe('editing the printable file', () => {
  const withFile = (name = 'Recipe.pdf') => make({}, { files: { printableFile: pdf(name) } });

  it('a new file replaces the saved one, and the old one is deleted after the save', async () => {
    const created = await withFile('Old.pdf');
    const updated = await service.updateExperience(created.uuid, {}, { files: { printableFile: pdf('New.pdf') }, userId: USER });
    expect(updated.printable.file).toBe('https://cdn.test/experiences/files/2-New.pdf');
    expect(updated.printable.fileName).toBe('New.pdf');
    expect(s3.deleteByKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Old.pdf');
  });

  it('removing it clears the address and the name, and deletes the stored file', async () => {
    const created = await withFile();
    const updated = await service.updateExperience(created.uuid, {}, { removePrintableFile: true });
    expect(updated.printable).toMatchObject({ file: null, fileName: '' });
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Recipe.pdf');
    // and in the database itself, not only in the answer
    const stored = await Experience.findOne({ uuid: created.uuid }).lean();
    expect(stored.printable.file).toBeNull();
    expect(stored.printable.fileName).toBe('');
  });

  it('removing a file that is not there is harmless and deletes nothing', async () => {
    const created = await make();
    const updated = await service.updateExperience(created.uuid, { title: 'B' }, { removePrintableFile: true });
    expect(updated.printable.file).toBeNull();
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });

  it('a file-only change is a valid edit (not "nothing to update")', async () => {
    const created = await make();
    await expect(service.updateExperience(created.uuid, {}, { files: { printableFile: pdf() } })).resolves.toMatchObject({ printable: { fileName: 'Recipe.pdf' } });
    await expect(service.updateExperience(created.uuid, {}, { removePrintableFile: true })).resolves.toMatchObject({ printable: { file: null } });
  });

  it('a request that changes nothing at all is still refused', async () => {
    const created = await make();
    expect(await failure(service.updateExperience(created.uuid, {}, {}))).toMatchObject({ statusCode: 400, code: 'NOTHING_TO_UPDATE' });
  });

  it('switching from a file to a link: the link goes in and the file is removed in the same save', async () => {
    const created = await withFile();
    const updated = await service.updateExperience(created.uuid, { printable: { link: LINK } }, { removePrintableFile: true });
    expect(updated.printable).toMatchObject({ link: LINK, file: null, fileName: '' });
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Recipe.pdf');
  });

  it('switching from a link to a file: the file goes in and the link is cleared in the same save', async () => {
    const created = await make({ printable: { link: LINK } });
    const updated = await service.updateExperience(created.uuid, { printable: { link: '', button: 'Print' } }, { files: { printableFile: pdf() } });
    expect(updated.printable).toMatchObject({ link: '', fileName: 'Recipe.pdf', button: 'Print' });
    expect(updated.printable.file).toBeTruthy();
  });

  it('refuses to leave a link and a file together, changes nothing, and stores nothing new', async () => {
    const created = await withFile();
    s3.uploadFileFromMulter.mockClear();
    const error = await failure(service.updateExperience(created.uuid, { printable: { link: LINK } }));
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(error.errors[0].field).toBe('printable.link');
    const stored = await service.getExperience(created.uuid);
    expect(stored.printable).toMatchObject({ link: '', fileName: 'Recipe.pdf' });
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });

  it('refuses a new file sent together with a link, and a link added to an experience that has a file', async () => {
    const withLink = await make({ printable: { link: LINK } });
    const error = await failure(service.updateExperience(withLink.uuid, {}, { files: { printableFile: pdf() } }));
    expect(error.errors[0].field).toBe('printable.link');
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
    const bothAtOnce = await make();
    expect(await failure(service.updateExperience(bothAtOnce.uuid, { printable: { link: LINK } }, { files: { printableFile: pdf() } }))).toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('editing something else leaves the file as it is', async () => {
    const created = await withFile();
    const updated = await service.updateExperience(created.uuid, { title: 'Another title' });
    expect(updated.printable.file).toBe(created.printable.file);
    expect(updated.printable.fileName).toBe('Recipe.pdf');
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });

  it('the button text can be changed without touching the file', async () => {
    const created = await withFile();
    const updated = await service.updateExperience(created.uuid, { printable: { link: '', button: 'Go' } });
    expect(updated.printable).toMatchObject({ button: 'Go', fileName: 'Recipe.pdf' });
  });

  it('answers 502 when the new file cannot be stored, and the saved one stays', async () => {
    const created = await withFile();
    s3.uploadFileFromMulter.mockRejectedValueOnce(new Error('S3 down'));
    expect(await failure(service.updateExperience(created.uuid, {}, { files: { printableFile: pdf('New.pdf') } }))).toMatchObject({ statusCode: 502 });
    expect((await service.getExperience(created.uuid)).printable.fileName).toBe('Recipe.pdf');
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });

  it('the new file is deleted again when the save fails, and the old one is kept', async () => {
    const created = await withFile();
    s3.deleteByKey.mockClear();
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(new Error('db down'));
    await expect(service.updateExperience(created.uuid, {}, { files: { printableFile: pdf('New.pdf') } })).rejects.toThrow('db down');
    expect(s3.deleteByKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/2-New.pdf');
  });

  it('an old file that cannot be deleted does not fail the edit', async () => {
    const created = await withFile();
    s3.deleteByKey.mockRejectedValue(new Error('S3 down'));
    await expect(service.updateExperience(created.uuid, {}, { removePrintableFile: true })).resolves.toMatchObject({ printable: { file: null } });
  });

  it('a stale edit is refused before anything is stored', async () => {
    const created = await withFile();
    s3.uploadFileFromMulter.mockClear();
    const error = await failure(
      service.updateExperience(created.uuid, {}, { files: { printableFile: pdf('New.pdf') }, expectedUpdatedAt: '2020-01-01T00:00:00.000Z' })
    );
    expect(error).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
  });
});

describe('deleting an experience with a printable file', () => {
  it('deletes the file from storage with the pictures', async () => {
    const created = await make({}, { files: { coverImage: picture('c.png'), printableFile: pdf('r.pdf') } });
    await service.deleteExperience(created.uuid);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1-c.png');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/2-r.pdf');
  });

  it('a file that cannot be deleted does not stop the delete', async () => {
    const created = await make({}, { files: { printableFile: pdf() } });
    s3.deleteByKey.mockRejectedValue(new Error('S3 down'));
    await expect(service.deleteExperience(created.uuid)).resolves.toMatchObject({ uuid: created.uuid });
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('an experience with no file deletes nothing for it', async () => {
    const created = await make();
    await service.deleteExperience(created.uuid);
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });
});

describe('the detail answer', () => {
  it('always has the file and its name next to the link, so the form can tell which one is used', async () => {
    const asLink = await make({ printable: { link: LINK } });
    const asFile = await make({}, { files: { printableFile: pdf() } });
    expect(Object.keys(asLink.printable).sort()).toEqual(['button', 'file', 'fileName', 'image', 'link']);
    expect(Object.keys(asFile.printable).sort()).toEqual(['button', 'file', 'fileName', 'image', 'link']);
    expect(asFile.printable.link).toBe('');
  });

  it('an older record without the new fields reads as "no file"', async () => {
    const created = await make({ printable: { link: LINK } });
    await Experience.collection.updateOne({ uuid: created.uuid }, { $unset: { 'printable.file': '', 'printable.fileName': '' } });
    const read = await service.getExperience(created.uuid);
    expect(read.printable).toMatchObject({ file: null, fileName: '', link: LINK });
  });

  it('a name is only shown while there is a file', async () => {
    const created = await make({}, { files: { printableFile: pdf('x.pdf') } });
    await Experience.collection.updateOne({ uuid: created.uuid }, { $set: { 'printable.file': null } });
    expect((await service.getExperience(created.uuid)).printable.fileName).toBe('');
  });
});

describe('cleaning a file name', () => {
  it.each([
    ['Recipe.pdf', 'Recipe.pdf'],
    ['  my   recipe .pdf ', 'my recipe .pdf'],
    ['a/b/c.pdf', 'c.pdf'],
    ['C:\\Users\\me\\r.docx', 'r.docx'],
    ['..\\..\\secret.pdf', 'secret.pdf'],
    ['tab\there.pdf', 'tabhere.pdf'],
    ['line\nbreak.pdf', 'linebreak.pdf'],
    ['', 'printable'],
    ['   ', 'printable'],
    ['..', 'printable'],
    ['.', 'printable'],
    [undefined, 'printable'],
    [null, 'printable'],
    ['folder/', 'printable'],
    [42, '42'],
  ])('%j becomes %j', (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected);
  });

  it('keeps 120 characters and cuts a longer one, keeping its ending', () => {
    const exact = `${'a'.repeat(116)}.pdf`;
    expect(exact).toHaveLength(120);
    expect(sanitizeFileName(exact)).toBe(exact);
    const cut = sanitizeFileName(`${'a'.repeat(200)}.pdf`);
    expect(cut).toHaveLength(120);
    expect(cut.endsWith('.pdf')).toBe(true);
    expect(sanitizeFileName('a'.repeat(300))).toHaveLength(120);
  });
});
