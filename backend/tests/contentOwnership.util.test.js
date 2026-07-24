const {
  CONTENT_CREATOR_ROLE,
  applyCreatorOwnershipFilter,
  applyCreatorSharedReadFilter,
  assertCreatorOwnsDocument,
  assertCreatorCanReadDocument,
  creatorOwnsDocument,
  isContentCreator,
  ContentOwnershipError,
} = require('../utils/contentOwnership');

describe('contentOwnership.util', () => {
  const creatorA = { _id: 'creator-a-id', role: CONTENT_CREATOR_ROLE };
  const creatorB = { _id: 'creator-b-id', role: CONTENT_CREATOR_ROLE };
  const admin = { _id: 'admin-id', role: 'admin' };

  it('scopes list queries to createdBy for content creators', () => {
    const query = applyCreatorOwnershipFilter(creatorA, { isArchived: false });
    expect(query).toEqual({ isArchived: false, createdBy: 'creator-a-id' });
  });

  it('does not scope list queries for admin', () => {
    const query = applyCreatorOwnershipFilter(admin, { isArchived: false });
    expect(query).toEqual({ isArchived: false });
  });

  it('shared read filter includes own content and published shared content for creators', () => {
    const query = applyCreatorSharedReadFilter(creatorA, { isArchived: false });
    expect(query).toEqual({
      isArchived: false,
      $and: [
        {
          $or: [{ createdBy: 'creator-a-id' }, { status: 'published' }],
        },
      ],
    });
  });

  it('shared read filter preserves search $or via $and', () => {
    const query = applyCreatorSharedReadFilter(
      creatorA,
      {
        isArchived: false,
        $or: [{ title: /cat/i }],
      },
      { publishedField: 'isPublished', publishedValue: true }
    );
    expect(query).toEqual({
      isArchived: false,
      $and: [
        { $or: [{ title: /cat/i }] },
        {
          $or: [{ createdBy: 'creator-a-id' }, { isPublished: true }],
        },
      ],
    });
  });

  it('does not apply shared read filter for admin', () => {
    const query = applyCreatorSharedReadFilter(admin, { isArchived: false });
    expect(query).toEqual({ isArchived: false });
  });

  it('allows owner to access own document', () => {
    expect(() =>
      assertCreatorOwnsDocument(creatorA, { createdBy: 'creator-a-id' })
    ).not.toThrow();
  });

  it('blocks content creator from managing another users document', () => {
    expect(() =>
      assertCreatorOwnsDocument(creatorA, { createdBy: 'creator-b-id' })
    ).toThrow(ContentOwnershipError);
  });

  it('allows admin to access any document', () => {
    expect(() =>
      assertCreatorOwnsDocument(admin, { createdBy: 'creator-b-id' })
    ).not.toThrow();
  });

  it('allows content creator to read another creators published document', () => {
    expect(() =>
      assertCreatorCanReadDocument(creatorA, {
        createdBy: 'creator-b-id',
        status: 'published',
      })
    ).not.toThrow();
  });

  it('blocks content creator from reading another creators draft document', () => {
    expect(() =>
      assertCreatorCanReadDocument(creatorA, {
        createdBy: 'creator-b-id',
        status: 'draft',
      })
    ).toThrow(ContentOwnershipError);
  });

  it('identifies content creator role and ownership', () => {
    expect(isContentCreator(creatorA)).toBe(true);
    expect(isContentCreator(admin)).toBe(false);
    expect(creatorOwnsDocument(creatorA, { createdBy: 'creator-a-id' })).toBe(true);
    expect(creatorOwnsDocument(creatorA, { createdBy: 'creator-b-id' })).toBe(false);
    expect(creatorOwnsDocument(creatorB, { createdBy: creatorB._id })).toBe(true);
  });
});
