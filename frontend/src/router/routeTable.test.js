import { describe, it, expect } from 'vitest';
import { SITE_ROUTES, CHILD_PAGES, CHILD_AREA_PATH, CHILD_ROLES } from './routeTable';
import { ROUTE_COMPONENTS } from './routeComponents';
import { CREATOR_AREA_KEYS, areaForPath } from '../utils/contentCreatorAccess';

/**
 * The site's routes exactly as they were before the pages were split into separate downloads
 * (path, guard, who may enter, layout, page). Written out by hand on purpose: if a route is dropped,
 * mistyped or given the wrong guard in the table, this list is what notices.
 */
const EXPECTED = [
  ['/login', 'public', null, null, 'AuthLogin'],
  ['/login/verify-otp', 'public', null, null, 'AdminLoginOtp'],
  ['/login/verify-2fa', 'public', null, null, 'LoginTwoFactor'],
  ['/parent/signup', 'public', null, null, 'ParentSignup'],
  ['/parent/signup/success', 'public', null, null, 'ParentSignupSuccess'],
  ['/parent/signup/cancel', 'public', null, null, 'ParentSignupCancel'],
  ['/forget/password', 'public', null, null, 'ForgetPassword'],
  ['/sendcode', 'public', null, null, 'SendCode'],
  ['/reset-password', 'public', null, null, 'ResetPassword'],
  ['/', 'open', null, null, 'AuthLogin'],

  ['/parents/login', 'guarded', ['parent'], null, 'ParentsLogin'],
  ['/parents/child', 'guarded', ['parent'], null, 'ParentsChild'],
  ['/parent/dashboard', 'guarded', ['parent'], 'ParentsLayout', 'ParentDashboard'],
  ['/parent/dashboard/printables', 'guarded', ['parent'], 'ParentsLayout', 'ParentsDashboardPrintableTab'],

  ['/admin/setup-2fa', 'guarded', ['admin'], null, 'AdminSetupTwoFactor'],
  ['/admin/dashboard', 'guarded', ['admin'], 'AdminLayout', 'AdminDashboard'],
  ['/admin/deletion-requests', 'guarded', ['admin'], 'AdminLayout', 'AdminDeletionRequests'],
  ['/admin/users', 'guarded', ['admin'], 'AdminLayout', 'AdminUsers'],
  ['/admin/module-access', 'guarded', ['admin'], 'AdminLayout', 'AdminModuleAccess'],
  ['/admin/notifications', 'guarded', ['admin'], 'AdminLayout', 'AdminNotifications'],
  ['/admin/content-creators', 'redirect', null, null, '/admin/users'],
  ['/admin/teachers', 'redirect', null, null, '/admin/users'],
  ['/admin/courses/contents', 'guarded', ['admin'], 'AdminLayout', 'AdminActivities'],
  ['/admin/courses', 'guarded', ['admin'], 'AdminLayout', 'AdminCourses'],
  ['/admin/courses/explore', 'guarded', ['admin'], 'AdminLayout', 'AdminExplore'],
  ['/admin/experiences', 'guarded', ['admin'], 'AdminLayout', 'AdminExperiences'],
  ['/admin/experiences/create', 'guarded', ['admin'], 'AdminLayout', 'AdminExperienceEditor'],
  ['/admin/experiences/:uuid/edit', 'guarded', ['admin'], 'AdminLayout', 'AdminExperienceEditor'],
  ['/admin/kids-wall', 'guarded', ['admin'], 'AdminLayout', 'AdminKidsWall'],
  ['/admin/checking-audio', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminCheckingAudio'],
  ['/admin/meetings', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminMeetings'],
  ['/admin/youtube-live', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminYoutubeLive'],
  ['/admin/printables', 'guarded', ['admin'], 'AdminLayout', 'AdminPrintables'],
  ['/admin/lesson-plans', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminLessonPlans'],
  ['/admin/built-in-books', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminBooksBuilder'],
  ['/admin/built-in-books/create', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminBooksBuilderCreate'],
  ['/admin/built-in-books/:bookId/edit', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminBooksBuilderCreate'],
  ['/admin/star-cam-missions', 'guarded', ['admin', 'teacher'], 'AdminLayout', 'AdminStarCamMissions'],
  ['/admin/*', 'guarded', ['admin'], 'AdminLayout', 'AdminDashboard'],

  ['/content-creator/dashboard', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'ContentCreatorDashboard'],
  ['/content-creator/contents', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminActivities'],
  ['/content-creator/explore', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminExplore'],
  ['/content-creator/built-in-books', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminBooksBuilder'],
  ['/content-creator/built-in-books/create', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminBooksBuilderCreate'],
  ['/content-creator/built-in-books/:bookId/edit', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminBooksBuilderCreate'],
  ['/content-creator/star-cam-missions', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminStarCamMissions'],
  ['/content-creator/notifications', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminNotifications'],
  ['/content-creator/experiences', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminExperiences'],
  ['/content-creator/experiences/create', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminExperienceEditor'],
  ['/content-creator/experiences/:uuid/edit', 'guarded', ['content_creator'], 'ContentCreatorLayout', 'AdminExperienceEditor'],
  ['/content-creator/*', 'guarded', ['content_creator'], null, 'ContentCreatorHome'],

  ['/teacher/dashboard', 'guarded', ['teacher'], 'TeacherLayout', 'TeacherDashboard'],
  ['/teacher/courses/contents', 'guarded', ['teacher'], 'TeacherLayout', 'AdminActivities'],
  ['/teacher/courses', 'guarded', ['teacher'], 'TeacherLayout', 'AdminCourses'],
  ['/teacher/courses/explore', 'guarded', ['teacher'], 'TeacherLayout', 'AdminExplore'],
  ['/teacher/kids-wall', 'guarded', ['teacher'], 'TeacherLayout', 'AdminKidsWall'],
  ['/teacher/checking-audio', 'guarded', ['admin', 'teacher'], 'TeacherLayout', 'AdminCheckingAudio'],
  ['/teacher/meetings', 'guarded', ['admin', 'teacher'], 'TeacherLayout', 'AdminMeetings'],
  ['/teacher/youtube-live', 'guarded', ['admin', 'teacher'], 'TeacherLayout', 'AdminYoutubeLive'],
  ['/teacher/star-cam-missions', 'guarded', ['admin', 'teacher'], 'TeacherLayout', 'AdminStarCamMissions'],
  ['/teacher/printables', 'guarded', ['teacher'], 'TeacherLayout', 'AdminPrintables'],
  ['/teacher/lesson-plans', 'guarded', ['teacher'], 'TeacherLayout', 'AdminLessonPlans'],
  ['/teacher/*', 'guarded', ['teacher'], 'TeacherLayout', 'TeacherDashboard'],
];

const EXPECTED_CHILD_PAGES = [
  ['/child/:id/home', 'ChildHome'],
  ['/child/:id/journey', 'ChildJourney'],
  ['/child/:id/journey/:courseId', 'ChildJourneyModule'],
  ['/child/:id/journey/:courseId/printables', 'ChildModulePrintables'],
  ['/child/:id/explore', 'ChildExplore'],
  ['/child/:id/explore/videos/:videoType', 'ChildExploreVideos'],
  ['/child/:id/explore/replays', 'ChildExploreReplays'],
  ['/child/:id/explore/experience', 'ChildExperiences'],
  ['/child/:id/explore/experience/:uuid', 'ChildExperienceDetail'],
  ['/child/:id/wall', 'ChildKidsWall'],
  ['/child/:id/wall/share', 'ChildShareSomething'],
  ['/child/:id/profile', 'ChildProfile'],
];

const describeRoute = (route) => [
  route.path,
  route.kind,
  route.roles || null,
  route.layout || null,
  route.kind === 'redirect' ? route.to : route.page,
];

describe('route table', () => {
  it('has exactly the routes the site had before the split, with the same guards and layouts', () => {
    expect(SITE_ROUTES.map(describeRoute)).toEqual(EXPECTED);
  });

  it('has no path twice', () => {
    const paths = SITE_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('gives every signed-in route a role list (an empty list would let anyone in)', () => {
    SITE_ROUTES.filter((route) => route.kind === 'guarded').forEach((route) => {
      expect(Array.isArray(route.roles) && route.roles.length > 0).toBe(true);
    });
  });

  it('only lets a parent into the child area', () => {
    expect(CHILD_ROLES).toEqual(['parent']);
  });

  it('keeps every child page at the address it had', () => {
    const full = CHILD_PAGES.map((route) => [`${CHILD_AREA_PATH}/${route.path}`, route.page]);
    expect(full).toEqual(expect.arrayContaining(EXPECTED_CHILD_PAGES));
    expect(full).toHaveLength(EXPECTED_CHILD_PAGES.length);
  });

  it('warms the child area while the parent is choosing a child', () => {
    const picker = SITE_ROUTES.find((route) => route.path === '/parents/child');
    expect(picker.warmWhenIdle).toEqual(['ChildShell', 'ChildHome']);
  });

  it('puts the bottom-navigation tabs first when the child pages are warmed', () => {
    expect(CHILD_PAGES.slice(0, 4).map((route) => route.page)).toEqual([
      'ChildHome',
      'ChildJourney',
      'ChildExplore',
      'ChildKidsWall',
    ]);
  });
});

describe('route components', () => {
  const names = new Set();
  SITE_ROUTES.forEach((route) => {
    if (route.page) names.add(route.page);
    if (route.layout) names.add(route.layout);
    (route.warmWhenIdle || []).forEach((name) => names.add(name));
  });
  CHILD_PAGES.forEach((route) => names.add(route.page));
  names.add('ChildShell');

  it.each([...names])('has a component for %s', (name) => {
    expect(ROUTE_COMPONENTS[name]).toBeTruthy();
  });

  it('has nothing that no route uses', () => {
    expect(Object.keys(ROUTE_COMPONENTS).sort()).toEqual([...names].sort());
  });

  it('downloads everything except the sign-in page on demand', () => {
    Object.entries(ROUTE_COMPONENTS).forEach(([name, component]) => {
      if (name === 'AuthLogin') {
        expect(component.preload).toBeUndefined();
      } else {
        expect(typeof component.preload).toBe('function');
      }
    });
  });
});

describe('content creator routes and access areas', () => {
  const creatorRoutes = SITE_ROUTES.filter((route) => route.kind === 'guarded' && route.roles.includes('content_creator'));
  const creatorPages = creatorRoutes.filter((route) => route.path !== '/content-creator/*');
  // A real address for a route with parameters
  const realAddress = (path) => path.replace(':bookId', 'book-1').replace(':uuid', 'uuid-1');

  it('gives every creator page an access area, and it is a real one', () => {
    creatorPages.forEach((route) => {
      expect([route.path, CREATOR_AREA_KEYS.includes(route.area)]).toEqual([route.path, true]);
    });
  });

  it('agrees with the access helper about which area every address belongs to', () => {
    creatorPages.forEach((route) => {
      expect([route.path, areaForPath(realAddress(route.path))]).toEqual([route.path, route.area]);
    });
  });

  it('has at least one page for every area', () => {
    CREATOR_AREA_KEYS.forEach((area) => {
      expect([area, creatorPages.some((route) => route.area === area)]).toEqual([area, true]);
    });
  });

  it('has the new Notifications and Experiences pages, using the pages admins use', () => {
    const byPath = Object.fromEntries(creatorPages.map((route) => [route.path, route]));

    expect(byPath['/content-creator/notifications']).toEqual(expect.objectContaining({ page: 'AdminNotifications', area: 'notifications' }));
    expect(byPath['/content-creator/experiences']).toEqual(expect.objectContaining({ page: 'AdminExperiences', area: 'experiences' }));
    expect(byPath['/content-creator/experiences/create'].page).toBe('AdminExperienceEditor');
    expect(byPath['/content-creator/experiences/:uuid/edit'].page).toBe('AdminExperienceEditor');
  });

  it('sends every other address to her landing page: no area, no layout, the home page', () => {
    const catchAll = creatorRoutes.find((route) => route.path === '/content-creator/*');

    expect(catchAll).toEqual(expect.objectContaining({ page: 'ContentCreatorHome', layout: null, roles: ['content_creator'] }));
    expect(catchAll.area).toBeUndefined();
  });

  it('keeps access areas out of the routes of every other role', () => {
    SITE_ROUTES.filter((route) => !route.path.startsWith('/content-creator')).forEach((route) => {
      expect([route.path, route.area]).toEqual([route.path, undefined]);
    });
  });

  it('only lets content creators into the content creator routes', () => {
    creatorRoutes.forEach((route) => expect(route.roles).toEqual(['content_creator']));
  });
});
