/**
 * Content creator access areas (step B2): the User model's list field, its validation, and the effective list every
 * JSON response carries. No database needed: documents are built and validated in memory.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const { ACCESS_AREA_KEYS, LEGACY_CREATOR_AREAS } = require('../utils/accessAreas');

const base = (role, extra = {}) => ({
  name: 'Pat',
  email: `${role}@example.com`,
  password: 'secret1',
  role,
  ...extra,
});

const make = (role, extra) => new User(base(role, extra));
const json = (doc) => JSON.parse(JSON.stringify(doc));
const errorFor = (doc) => doc.validateSync()?.errors?.accessAreas;

describe('User.accessAreas: the stored field', () => {
  it('is not stored at all until someone gives the creator a list (no empty list from Mongoose)', () => {
    const creator = make('content_creator');

    expect(creator.accessAreas).toBeUndefined();
    expect(creator.toObject().accessAreas).toBeUndefined();
    expect(creator.get('accessAreas')).toBeUndefined();
  });

  it('also stays unset for every other role', () => {
    ['admin', 'teacher', 'parent'].forEach((role) => expect(make(role).accessAreas).toBeUndefined());
  });

  it('keeps the list it was given', () => {
    const creator = make('content_creator', { accessAreas: ['notifications', 'experiences'] });

    expect(Array.from(creator.accessAreas)).toEqual(['notifications', 'experiences']);
    expect(creator.validateSync()).toBeUndefined();
  });

  it('records when and by whom the list was last changed, empty until then', () => {
    const creator = make('content_creator');

    expect(creator.accessUpdatedAt).toBeNull();
    expect(creator.accessUpdatedBy).toBeNull();

    const adminId = new mongoose.Types.ObjectId();
    const changed = make('content_creator', { accessAreas: ['explore'], accessUpdatedAt: new Date(), accessUpdatedBy: adminId });
    expect(String(changed.accessUpdatedBy)).toBe(String(adminId));
    expect(changed.accessUpdatedAt).toBeInstanceOf(Date);
  });
});

describe('User.accessAreas: validation', () => {
  it('accepts a creator with no list, and with any non-empty list of known areas', () => {
    expect(make('content_creator').validateSync()).toBeUndefined();
    expect(make('content_creator', { accessAreas: ['notifications'] }).validateSync()).toBeUndefined();
    expect(make('content_creator', { accessAreas: [...ACCESS_AREA_KEYS] }).validateSync()).toBeUndefined();
  });

  it('refuses an empty list', () => {
    expect(errorFor(make('content_creator', { accessAreas: [] }))).toBeDefined();
  });

  it('refuses an unknown area, in any spelling', () => {
    ['billing', 'Contents', ' contents', ''].forEach((bad) => {
      expect(errorFor(make('content_creator', { accessAreas: ['explore', bad] }))).toBeDefined();
    });
  });

  it('refuses duplicates', () => {
    expect(errorFor(make('content_creator', { accessAreas: ['explore', 'explore'] }))).toBeDefined();
  });

  it('refuses a list for anyone who is not a content creator', () => {
    ['admin', 'teacher', 'parent'].forEach((role) => {
      expect(errorFor(make(role, { accessAreas: ['notifications'] }))).toBeDefined();
    });
  });

  it('does not get in the way of the other roles that carry no list', () => {
    ['admin', 'teacher', 'parent'].forEach((role) => expect(make(role).validateSync()).toBeUndefined());
  });

  it('says what is wrong in plain words', () => {
    expect(errorFor(make('content_creator', { accessAreas: [] })).message).toMatch(/non-empty list of known areas/);
  });
});

describe('User JSON: every response carries the effective list', () => {
  it('gives a creator that has never been given a list what she had before: the legacy set', () => {
    const body = json(make('content_creator'));

    expect(body.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect(body.accessAreas).not.toContain('notifications');
    expect(body.accessAreas).not.toContain('experiences');
  });

  it('gives a creator with a saved list exactly that list, in the usual order', () => {
    expect(json(make('content_creator', { accessAreas: ['notifications'] })).accessAreas).toEqual(['notifications']);
    expect(json(make('content_creator', { accessAreas: ['experiences', 'dashboard'] })).accessAreas).toEqual([
      'dashboard',
      'experiences',
    ]);
  });

  it('does not add the legacy set to a saved list', () => {
    expect(json(make('content_creator', { accessAreas: ['notifications'] })).accessAreas).not.toContain('contents');
  });

  it('gives an admin and a teacher every area, whatever is stored', () => {
    expect(json(make('admin')).accessAreas).toEqual(ACCESS_AREA_KEYS);
    expect(json(make('teacher')).accessAreas).toEqual(ACCESS_AREA_KEYS);
  });

  it('leaves the field out for a parent and a child', () => {
    expect(json(make('parent'))).not.toHaveProperty('accessAreas');
    expect(json(new User({ name: 'Kid', role: 'child', linkedParent: new mongoose.Types.ObjectId() }))).not.toHaveProperty(
      'accessAreas'
    );
  });

  it('hides a leftover list on someone who is no longer a creator (e.g. a role changed later)', () => {
    // Built directly, as a row read from the database would be: validation does not run on read
    const parent = make('parent', { accessAreas: ['notifications'] });

    expect(json(parent)).not.toHaveProperty('accessAreas');
  });

  it('is what JSON.stringify and res.json produce (they call toJSON)', () => {
    const creator = make('content_creator', { accessAreas: ['experiences'] });

    expect(JSON.parse(JSON.stringify({ user: creator })).user.accessAreas).toEqual(['experiences']);
    expect(creator.toJSON().accessAreas).toEqual(['experiences']);
  });

  it('keeps the rest of the user as it was', () => {
    const body = json(make('content_creator', { accessAreas: ['explore'] }));

    expect(body).toEqual(expect.objectContaining({ name: 'Pat', email: 'content_creator@example.com', role: 'content_creator' }));
    expect(body).toHaveProperty('_id');
    expect(body.accessUpdatedAt).toBeNull();
  });

  it('does not invent a list when the query did not load it (e.g. populate with only name and role)', () => {
    const partial = new User({ _id: new mongoose.Types.ObjectId(), name: 'Pat', role: 'content_creator' }, { name: 1, role: 1 });
    const body = json(partial);

    expect(body).not.toHaveProperty('accessAreas');
    expect(body.role).toBe('content_creator');
  });

  it('does not invent a list when the role was not loaded either', () => {
    const partial = new User({ _id: new mongoose.Types.ObjectId(), name: 'Pat' }, { name: 1 });

    expect(json(partial)).not.toHaveProperty('accessAreas');
  });

  it('shows the real list when the query loaded both role and list', () => {
    const loaded = new User(
      { _id: new mongoose.Types.ObjectId(), name: 'Pat', role: 'content_creator', accessAreas: ['notifications'] },
      { name: 1, role: 1, accessAreas: 1 }
    );

    expect(json(loaded).accessAreas).toEqual(['notifications']);
  });

  it('works for a user shown inside another document (a populated owner)', () => {
    const owner = make('content_creator', { accessAreas: ['contents'] });
    const wrapper = { createdBy: owner };

    expect(JSON.parse(JSON.stringify(wrapper)).createdBy.accessAreas).toEqual(['contents']);
  });
});

describe('User.toObject is left alone', () => {
  it('still returns what is stored, so code that reads the raw field is not surprised', () => {
    expect(make('content_creator').toObject().accessAreas).toBeUndefined();
    expect(make('content_creator', { accessAreas: ['explore'] }).toObject().accessAreas).toEqual(['explore']);
  });
});
