/**
 * Uploading the printable file (a PDF or Word document) over real HTTP: the real routes, upload middleware,
 * controller, service, model and database, with only storage (S3) faked.
 *
 * What matters: only PDF, DOC and DOCX get in, the file must really be one (not just be called one), 20 MB is the
 * limit for the printable while pictures keep their 8 MB, every refusal is a clear 4xx with a stable code, and a link
 * and a file are never both kept.
 */
const ENV = {
  JWT_SECRET: 'e2e-experience-printable-file-secret-long-enough-1234567890',
  MAIL_DRIVER: 'log',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const s3 = require('../services/s3.service');
const { User } = require('../models');
const Experience = require('../models/Experience');
const experienceAdminRoutes = require('../routes/experienceAdmin.routes');
const errorHandler = require('../middleware/errorHandler');
const requestId = require('../middleware/requestId');
const { hasSignature, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, DOCUMENT_TYPES } = require('../middleware/uploadExperience');

jest.setTimeout(120000);

const BASE = '/api/admin/experiences';
const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const LINK = 'https://riseup.kids/downloads/recipe.pdf';
const MB = 1024 * 1024;

const PDF_MIME = 'application/pdf';
const DOC_MIME = 'application/msword';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** The first bytes of each kind of file, padded to the size asked for. */
const pdfBytes = (size = 64) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(Math.max(0, size - 9), 0x20)]);
const docxBytes = (size = 64) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(Math.max(0, size - 4), 1)]);
const docBytes = (size = 64) => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(Math.max(0, size - 8), 1)]);
const pngBytes = (size = 64) => Buffer.alloc(size, 1);

let mongod;
let app;
let adminToken;
let counter;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();

  app = express();
  app.set('trust proxy', false);
  app.use(requestId);
  app.use(express.json());
  app.use(BASE, experienceAdminRoutes);
  app.use(errorHandler);

  const admin = await User.create({ name: 'admin', email: 'admin@example.com', password: 'CorrectHorse42', role: 'admin', twoFactorEnabled: true });
  adminToken = jwt.sign({ id: admin._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(async () => {
  await Experience.deleteMany({});
  jest.restoreAllMocks();
  jest.clearAllMocks();
  counter = 0;
  s3.uploadFileFromMulter.mockImplementation(async (file, folder) => ({ url: `https://cdn.test/${folder}/${++counter}-${file.originalname}` }));
  s3.getS3KeyFromUrl.mockImplementation((url) => (String(url).startsWith('https://cdn.test/') ? String(url).slice(17) : null));
  s3.deleteByKey.mockResolvedValue(undefined);
});

const auth = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const base = () => auth(request(app).post(BASE)).field('title', 'Smoothie').field('videos', JSON.stringify([{ title: 'V', embedUrl: V1 }]));
const withFile = (req, buffer, filename, contentType, field = 'printableFile') => req.attach(field, buffer, { filename, contentType });
const create = (buffer, filename, contentType) => withFile(base(), buffer, filename, contentType);
const edit = (uuid) => auth(request(app).put(`${BASE}/${uuid}`));

describe('the files that get in', () => {
  it.each([
    ['a PDF', pdfBytes, 'Recipe.pdf', PDF_MIME],
    ['a Word document (DOCX)', docxBytes, 'Recipe.docx', DOCX_MIME],
    ['an older Word document (DOC)', docBytes, 'Recipe.doc', DOC_MIME],
  ])('accepts %s and keeps its name', async (_, bytes, filename, mime) => {
    const res = await create(bytes(), filename, mime);
    expect(res.status).toBe(201);
    expect(res.body.data.printable.fileName).toBe(filename);
    expect(res.body.data.printable.file).toBe(`https://cdn.test/experiences/files/1-${filename}`);
    expect(res.body.data.printable.link).toBe('');
    expect(s3.uploadFileFromMulter).toHaveBeenCalledWith(expect.objectContaining({ originalname: filename, mimetype: mime }), 'experiences/files');
  });

  it('accepts the ending in capitals (RECIPE.PDF)', async () => {
    expect((await create(pdfBytes(), 'RECIPE.PDF', PDF_MIME)).status).toBe(201);
  });

  it('a PDF that has a few bytes before its header is still a PDF (some tools add them)', async () => {
    const res = await create(Buffer.concat([Buffer.from('\n\n  junk '), pdfBytes()]), 'Recipe.pdf', PDF_MIME);
    expect(res.status).toBe(201);
  });

  it('a cover, a printable picture and a printable file can all come in one request', async () => {
    const res = await withFile(
      withFile(withFile(base(), pngBytes(), 'cover.png', 'image/png', 'coverImage'), pngBytes(), 'print.png', 'image/png', 'printableImage'),
      pdfBytes(),
      'Recipe.pdf',
      PDF_MIME
    );
    expect(res.status).toBe(201);
    expect(res.body.data.coverImage).toMatch(/experiences\/images\//);
    expect(res.body.data.printable.image).toMatch(/experiences\/images\//);
    expect(res.body.data.printable.file).toMatch(/experiences\/files\//);
    expect(s3.uploadFileFromMulter).toHaveBeenCalledTimes(3);
  });

  it('is stored where the other experience files are, with its own folder', async () => {
    await create(pdfBytes(), 'Recipe.pdf', PDF_MIME);
    expect(s3.uploadFileFromMulter.mock.calls[0][1]).toBe('experiences/files');
  });

  it('the name is cleaned (no folders)', async () => {
    const res = await create(pdfBytes(), '../../etc/recipe.pdf', PDF_MIME);
    expect(res.status).toBe(201);
    expect(res.body.data.printable.fileName).toBe('recipe.pdf');
  });
});

describe('the files that do not', () => {
  const refused = async (promise, status, code) => {
    const res = await promise;
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ success: false, code });
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
    expect(await Experience.countDocuments()).toBe(0);
    return res;
  };

  it.each([
    ['a text file', Buffer.from('hello there, this is text'), 'notes.txt', 'text/plain'],
    ['a program', Buffer.from('MZ-this-is-a-program-xxxxxxxx'), 'setup.exe', 'application/x-msdownload'],
    ['a picture', pngBytes(), 'photo.png', 'image/png'],
    ['a web page', Buffer.from('<html><body>hi</body></html>'), 'page.html', 'text/html'],
    ['a spreadsheet', docxBytes(), 'sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['a zip', docxBytes(), 'bundle.zip', 'application/zip'],
  ])('refuses %s with the same message the form gives', async (_, bytes, filename, mime) => {
    const res = await refused(create(bytes, filename, mime), 415, 'UNSUPPORTED_FILE_TYPE');
    expect(res.body.message).toBe('The printable must be a PDF or a Word document (DOC or DOCX).');
  });

  it('refuses a file that is called a PDF but is not one (the first bytes tell)', async () => {
    const res = await refused(create(Buffer.from('this is only text, not a pdf at all'), 'fake.pdf', PDF_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
    expect(res.body.message).toBe('That file does not look like a PDF or Word document. Check it opens, then try again.');
  });

  it('refuses a DOCX that is not a zip, and a DOC that is not a Word file', async () => {
    await refused(create(pdfBytes(), 'fake.docx', DOCX_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
    await refused(create(pdfBytes(), 'fake.doc', DOC_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
  });

  it('refuses a name and a type that do not agree (a .pdf that says it is a Word file, or an .exe that says PDF)', async () => {
    await refused(create(pdfBytes(), 'recipe.pdf', DOCX_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
    await refused(create(pdfBytes(), 'recipe.exe', PDF_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
    await refused(create(pdfBytes(), 'recipe', PDF_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
  });

  it('refuses a file that is far too short to be a document', async () => {
    await refused(create(Buffer.from('%PDF'), 'tiny.pdf', PDF_MIME), 415, 'UNSUPPORTED_FILE_TYPE');
  });

  it('a picture sent in the printable file box is not accepted as a document, and a PDF sent as a picture is not accepted as a picture', async () => {
    await refused(withFile(base(), pdfBytes(), 'recipe.pdf', PDF_MIME, 'coverImage'), 415, 'UNSUPPORTED_FILE_TYPE');
    await refused(withFile(base(), pngBytes(), 'photo.png', 'image/png', 'printableFile'), 415, 'UNSUPPORTED_FILE_TYPE');
  });

  it('refuses two files in the printable box, and a file in a box that does not exist', async () => {
    await refused(withFile(withFile(base(), pdfBytes(), 'a.pdf', PDF_MIME), pdfBytes(), 'b.pdf', PDF_MIME), 400, 'UNEXPECTED_FILE');
    await refused(withFile(base(), pdfBytes(), 'a.pdf', PDF_MIME, 'document'), 400, 'UNEXPECTED_FILE');
  });
});

describe('the sizes', () => {
  it('limits are 8 MB for a picture and 20 MB for the printable', () => {
    expect(MAX_IMAGE_BYTES).toBe(8 * MB);
    expect(MAX_DOCUMENT_BYTES).toBe(20 * MB);
  });

  it('a printable of 15 MB is fine (more than a picture may be)', async () => {
    expect((await create(pdfBytes(15 * MB), 'big.pdf', PDF_MIME)).status).toBe(201);
  });

  it('exactly 20 MB is accepted', async () => {
    expect((await create(pdfBytes(20 * MB), 'edge.pdf', PDF_MIME)).status).toBe(201);
  });

  it('one byte more is refused as too large, with the printable limit in the message', async () => {
    const res = await create(pdfBytes(20 * MB + 1), 'huge.pdf', PDF_MIME);
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ success: false, code: 'FILE_TOO_LARGE', message: 'The file is too large. The maximum size is 20 MB.' });
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('a picture still stops at 8 MB, even though the printable may be bigger', async () => {
    const exact = await withFile(base(), pngBytes(8 * MB), 'a.png', 'image/png', 'coverImage');
    expect(exact.status).toBe(201);
    await Experience.deleteMany({});
    for (const size of [8 * MB + 1, 9 * MB, 19 * MB]) {
      const res = await withFile(base(), pngBytes(size), 'big.png', 'image/png', 'printableImage');
      expect(res.status).toBe(413);
      expect(res.body).toMatchObject({ code: 'FILE_TOO_LARGE', message: 'The picture is too large. The maximum size is 8 MB.' });
    }
    const overTheDocumentLimit = await withFile(base(), pngBytes(20 * MB + 1), 'huge.png', 'image/png', 'coverImage');
    expect(overTheDocumentLimit.status).toBe(413);
    expect(overTheDocumentLimit.body.message).toBe('The picture is too large. The maximum size is 8 MB.');
  });

  it('a refused request stores nothing, even if its other file was fine', async () => {
    const res = await withFile(withFile(base(), pngBytes(9 * MB), 'big.png', 'image/png', 'coverImage'), pdfBytes(), 'ok.pdf', PDF_MIME);
    expect(res.status).toBe(413);
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
  });
});

describe('a link or a file', () => {
  it('a link and a file together are refused, naming the link', async () => {
    const res = await withFile(base().field('printable', JSON.stringify({ link: LINK, button: 'Print' })), pdfBytes(), 'recipe.pdf', PDF_MIME);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(res.body.errors).toEqual([{ field: 'printable.link', message: 'Choose a link or a file for the printable, not both.' }]);
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
  });

  it('an empty link with a file is fine, with the button text', async () => {
    const res = await withFile(base().field('printable', JSON.stringify({ link: '', button: 'Print recipe' })), pdfBytes(), 'recipe.pdf', PDF_MIME);
    expect(res.status).toBe(201);
    expect(res.body.data.printable).toMatchObject({ link: '', button: 'Print recipe', fileName: 'recipe.pdf' });
  });

  describe('editing', () => {
    let created;
    beforeEach(async () => {
      created = (await create(pdfBytes(), 'Old.pdf', PDF_MIME)).body.data;
    });

    it('a new file replaces the old one, which is deleted', async () => {
      const res = await withFile(edit(created.uuid), docxBytes(), 'New.docx', DOCX_MIME);
      expect(res.status).toBe(200);
      expect(res.body.data.printable).toMatchObject({ fileName: 'New.docx', file: 'https://cdn.test/experiences/files/2-New.docx' });
      expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Old.pdf');
    });

    it('removePrintableFile removes it', async () => {
      const res = await edit(created.uuid).field('removePrintableFile', 'true');
      expect(res.status).toBe(200);
      expect(res.body.data.printable).toMatchObject({ file: null, fileName: '' });
      expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Old.pdf');
    });

    it('anything but "true" does not remove it', async () => {
      const res = await edit(created.uuid).field('removePrintableFile', 'false').field('title', 'Other');
      expect(res.status).toBe(200);
      expect(res.body.data.printable.fileName).toBe('Old.pdf');
    });

    it('switching to a link: the link and the removal in one request', async () => {
      const res = await edit(created.uuid)
        .field('printable', JSON.stringify({ link: LINK, button: 'Print' }))
        .field('removePrintableFile', 'true');
      expect(res.status).toBe(200);
      expect(res.body.data.printable).toMatchObject({ link: LINK, file: null, fileName: '' });
    });

    it('a link without removing the file is refused, and nothing changes', async () => {
      const res = await edit(created.uuid).field('printable', JSON.stringify({ link: LINK, button: 'Print' }));
      expect(res.status).toBe(400);
      expect(res.body.errors[0].field).toBe('printable.link');
      expect((await Experience.findOne({ uuid: created.uuid })).printable.link).toBe('');
    });

    it('switching to a file: the file and the cleared link in one request', async () => {
      const linkOnly = (await base().field('printable', JSON.stringify({ link: LINK, button: 'Print' }))).body.data;
      const res = await withFile(edit(linkOnly.uuid).field('printable', JSON.stringify({ link: '', button: 'Print' })), pdfBytes(), 'recipe.pdf', PDF_MIME);
      expect(res.status).toBe(200);
      expect(res.body.data.printable).toMatchObject({ link: '', fileName: 'recipe.pdf' });
    });

    it('a request with only a file (nothing else) is a valid edit', async () => {
      const res = await withFile(edit(created.uuid), pdfBytes(), 'again.pdf', PDF_MIME);
      expect(res.status).toBe(200);
    });
  });

  it('deleting the experience deletes its file', async () => {
    const created = (await create(pdfBytes(), 'Recipe.pdf', PDF_MIME)).body.data;
    const res = await auth(request(app).delete(`${BASE}/${created.uuid}`));
    expect(res.status).toBe(200);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/files/1-Recipe.pdf');
  });

  it('only a signed-in admin can upload', async () => {
    const res = await withFile(request(app).post(BASE).field('title', 'x'), pdfBytes(), 'a.pdf', PDF_MIME);
    expect(res.status).toBe(401);
    expect(s3.uploadFileFromMulter).not.toHaveBeenCalled();
  });
});

describe('what a file looks like from its first bytes', () => {
  it('knows a PDF, a Word 2007+ file and an older Word file', () => {
    expect(hasSignature(pdfBytes(), 'pdf')).toBe(true);
    expect(hasSignature(docxBytes(), 'docx')).toBe(true);
    expect(hasSignature(docBytes(), 'doc')).toBe(true);
  });

  it('does not mix them up, and refuses anything else', () => {
    expect(hasSignature(pdfBytes(), 'docx')).toBe(false);
    expect(hasSignature(docxBytes(), 'pdf')).toBe(false);
    expect(hasSignature(docBytes(), 'docx')).toBe(false);
    expect(hasSignature(docxBytes(), 'doc')).toBe(false);
    expect(hasSignature(pdfBytes(), 'exe')).toBe(false);
    expect(hasSignature(null, 'pdf')).toBe(false);
    expect(hasSignature('%PDF-1.4 text', 'pdf')).toBe(false);
    expect(hasSignature(Buffer.from('%PDF-1'), 'pdf')).toBe(false);
  });

  it('a zip that is not a Word file is still a zip (the first four bytes decide), and PK without the right next bytes is not', () => {
    expect(hasSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), 'docx')).toBe(true);
    expect(hasSignature(Buffer.from([0x50, 0x4b, 0x03, 0x05, 0, 0, 0, 0]), 'docx')).toBe(false);
    expect(hasSignature(Buffer.from([0x50, 0x4b, 0x04, 0x04, 0, 0, 0, 0]), 'docx')).toBe(false);
    expect(hasSignature(Buffer.from([0x51, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), 'docx')).toBe(false);
    expect(hasSignature(Buffer.from([0x50, 0x4c, 0x03, 0x04, 0, 0, 0, 0]), 'docx')).toBe(false);
  });

  it('an older Word file must have all eight bytes of its header', () => {
    const header = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    expect(hasSignature(Buffer.from(header), 'doc')).toBe(true);
    for (let i = 0; i < header.length; i += 1) {
      const wrong = [...header];
      wrong[i] = 0x00;
      expect(hasSignature(Buffer.from(wrong), 'doc')).toBe(false);
    }
  });

  it('a PDF header after the first 1024 bytes does not count', () => {
    expect(hasSignature(Buffer.concat([Buffer.alloc(1100, 0x20), Buffer.from('%PDF-1.4')]), 'pdf')).toBe(false);
  });

  it('lists exactly the three types, each with its ending', () => {
    expect(DOCUMENT_TYPES.map((type) => [type.extension, type.mime, type.kind])).toEqual([
      ['.pdf', PDF_MIME, 'pdf'],
      ['.doc', DOC_MIME, 'doc'],
      ['.docx', DOCX_MIME, 'docx'],
    ]);
  });
});
