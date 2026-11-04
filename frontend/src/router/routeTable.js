/**
 * Every route of the site as plain data (no component imports, so it is cheap to load and to test).
 *
 *  - `public`  : only for signed-out visitors (UnAuthed)
 *  - `open`    : no guard at all
 *  - `guarded` : signed-in with one of `roles` (AuthedAccess), drawn in `layout` when there is one
 *  - `redirect`: sends the visitor to `to`
 *
 * `page` and `layout` are names looked up in routeComponents.js.
 */

const ADMIN = ['admin'];
const STAFF = ['admin', 'teacher'];
const TEACHER = ['teacher'];
const CREATOR = ['content_creator'];
const PARENT = ['parent'];

const publicPage = (path, page) => ({ kind: 'public', path, page });
const guarded = (path, roles, layout, page, extra = {}) => ({ kind: 'guarded', path, roles, layout, page, ...extra });

export const SITE_ROUTES = [
  // Signed-out pages
  publicPage('/login', 'AuthLogin'),
  publicPage('/login/verify-otp', 'AdminLoginOtp'),
  publicPage('/login/verify-2fa', 'LoginTwoFactor'),
  publicPage('/parent/signup', 'ParentSignup'),
  publicPage('/parent/signup/success', 'ParentSignupSuccess'),
  publicPage('/parent/signup/cancel', 'ParentSignupCancel'),
  publicPage('/forget/password', 'ForgetPassword'),
  publicPage('/sendcode', 'SendCode'),
  publicPage('/reset-password', 'ResetPassword'),
  { kind: 'open', path: '/', page: 'AuthLogin' },

  // Parent
  guarded('/parents/login', PARENT, null, 'ParentsLogin'),
  // The child picker is the step before a child's Home, so the child area is warmed while it is open.
  guarded('/parents/child', PARENT, null, 'ParentsChild', { warmWhenIdle: ['ChildShell', 'ChildHome'] }),
  guarded('/parent/dashboard', PARENT, 'ParentsLayout', 'ParentDashboard'),
  guarded('/parent/dashboard/printables', PARENT, 'ParentsLayout', 'ParentsDashboardPrintableTab'),

  // Admin
  guarded('/admin/setup-2fa', ADMIN, null, 'AdminSetupTwoFactor'),
  guarded('/admin/dashboard', ADMIN, 'AdminLayout', 'AdminDashboard'),
  guarded('/admin/deletion-requests', ADMIN, 'AdminLayout', 'AdminDeletionRequests'),
  guarded('/admin/users', ADMIN, 'AdminLayout', 'AdminUsers'),
  guarded('/admin/module-access', ADMIN, 'AdminLayout', 'AdminModuleAccess'),
  guarded('/admin/notifications', ADMIN, 'AdminLayout', 'AdminNotifications'),
  { kind: 'redirect', path: '/admin/content-creators', to: '/admin/users' },
  { kind: 'redirect', path: '/admin/teachers', to: '/admin/users' },
  guarded('/admin/courses/contents', ADMIN, 'AdminLayout', 'AdminActivities'),
  guarded('/admin/courses', ADMIN, 'AdminLayout', 'AdminCourses'),
  guarded('/admin/courses/explore', ADMIN, 'AdminLayout', 'AdminExplore'),
  guarded('/admin/kids-wall', ADMIN, 'AdminLayout', 'AdminKidsWall'),
  guarded('/admin/checking-audio', STAFF, 'AdminLayout', 'AdminCheckingAudio'),
  guarded('/admin/meetings', STAFF, 'AdminLayout', 'AdminMeetings'),
  guarded('/admin/youtube-live', STAFF, 'AdminLayout', 'AdminYoutubeLive'),
  guarded('/admin/printables', ADMIN, 'AdminLayout', 'AdminPrintables'),
  guarded('/admin/lesson-plans', STAFF, 'AdminLayout', 'AdminLessonPlans'),
  guarded('/admin/built-in-books', STAFF, 'AdminLayout', 'AdminBooksBuilder'),
  guarded('/admin/built-in-books/create', STAFF, 'AdminLayout', 'AdminBooksBuilderCreate'),
  guarded('/admin/built-in-books/:bookId/edit', STAFF, 'AdminLayout', 'AdminBooksBuilderCreate'),
  guarded('/admin/star-cam-missions', STAFF, 'AdminLayout', 'AdminStarCamMissions'),
  guarded('/admin/*', ADMIN, 'AdminLayout', 'AdminDashboard'),

  // Content creator
  guarded('/content-creator/dashboard', CREATOR, 'ContentCreatorLayout', 'ContentCreatorDashboard'),
  guarded('/content-creator/contents', CREATOR, 'ContentCreatorLayout', 'AdminActivities'),
  guarded('/content-creator/explore', CREATOR, 'ContentCreatorLayout', 'AdminExplore'),
  guarded('/content-creator/built-in-books', CREATOR, 'ContentCreatorLayout', 'AdminBooksBuilder'),
  guarded('/content-creator/built-in-books/create', CREATOR, 'ContentCreatorLayout', 'AdminBooksBuilderCreate'),
  guarded('/content-creator/built-in-books/:bookId/edit', CREATOR, 'ContentCreatorLayout', 'AdminBooksBuilderCreate'),
  guarded('/content-creator/star-cam-missions', CREATOR, 'ContentCreatorLayout', 'AdminStarCamMissions'),
  guarded('/content-creator/*', CREATOR, 'ContentCreatorLayout', 'ContentCreatorDashboard'),

  // Teacher
  guarded('/teacher/dashboard', TEACHER, 'TeacherLayout', 'TeacherDashboard'),
  guarded('/teacher/courses/contents', TEACHER, 'TeacherLayout', 'AdminActivities'),
  guarded('/teacher/courses', TEACHER, 'TeacherLayout', 'AdminCourses'),
  guarded('/teacher/courses/explore', TEACHER, 'TeacherLayout', 'AdminExplore'),
  guarded('/teacher/kids-wall', TEACHER, 'TeacherLayout', 'AdminKidsWall'),
  guarded('/teacher/checking-audio', STAFF, 'TeacherLayout', 'AdminCheckingAudio'),
  guarded('/teacher/meetings', STAFF, 'TeacherLayout', 'AdminMeetings'),
  guarded('/teacher/youtube-live', STAFF, 'TeacherLayout', 'AdminYoutubeLive'),
  guarded('/teacher/star-cam-missions', STAFF, 'TeacherLayout', 'AdminStarCamMissions'),
  guarded('/teacher/printables', TEACHER, 'TeacherLayout', 'AdminPrintables'),
  guarded('/teacher/lesson-plans', TEACHER, 'TeacherLayout', 'AdminLessonPlans'),
  guarded('/teacher/*', TEACHER, 'TeacherLayout', 'TeacherDashboard'),
];

/**
 * The child area. All of these live under /child/:id inside one shared frame (header and bottom
 * navigation), which stays on screen while a page's code downloads and while the child moves around.
 * Order is the order the pages are warmed in the background (the bottom-navigation tabs first).
 */
export const CHILD_AREA_PATH = '/child/:id';
export const CHILD_ROLES = PARENT;

export const CHILD_PAGES = [
  { path: 'home', page: 'ChildHome' },
  { path: 'journey', page: 'ChildJourney' },
  { path: 'explore', page: 'ChildExplore' },
  { path: 'wall', page: 'ChildKidsWall' },
  { path: 'profile', page: 'ChildProfile' },
  { path: 'journey/:courseId', page: 'ChildJourneyModule' },
  { path: 'explore/videos/:videoType', page: 'ChildExploreVideos' },
  { path: 'explore/replays', page: 'ChildExploreReplays' },
  { path: 'wall/share', page: 'ChildShareSomething' },
  { path: 'journey/:courseId/printables', page: 'ChildModulePrintables' },
];
