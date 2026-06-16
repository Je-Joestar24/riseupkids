const {
  CONTENT_CREATOR_ROLE,
  applyCreatorOwnershipFilter,
  assertCreatorOwnsDocument,
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

  it('allows owner to access own document', () => {
    expect(() =>
      assertCreatorOwnsDocument(creatorA, { createdBy: 'creator-a-id' })
    ).not.toThrow();
  });

  it('blocks content creator from another users document', () => {
    expect(() =>
      assertCreatorOwnsDocument(creatorA, { createdBy: 'creator-b-id' })
    ).toThrow(ContentOwnershipError);
  });

  it('allows admin to access any document', () => {
    expect(() =>
      assertCreatorOwnsDocument(admin, { createdBy: 'creator-b-id' })
    ).not.toThrow();
  });

  it('identifies content creator role', () => {
    expect(isContentCreator(creatorA)).toBe(true);
    expect(isContentCreator(admin)).toBe(false);
  });
});
