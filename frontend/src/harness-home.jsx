// TEMPORARY test page for looking at the child Explore pages at phone widths. Never commit.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './assets/css/App.css';
import theme from './config/theme';
import { store } from './store/store';
import ChildLayout from './layouts/ChildLayout';
import ChildExplore from './pages/child/ChildExplore';
import ChildExploreVideos from './pages/child/ChildExploreVideos';
import exploreService from './services/exploreServices';
import exploreVideoWatchService from './services/exploreVideoWatchService';
import childrenService from './services/childrenService';

const params = new URLSearchParams(window.location.search);
const route = params.get('route') || 'explore';
const origin = window.location.origin;
const img = (name) => `${origin}/src/assets/images/${name}`;

const child = { _id: 'kid1', displayName: 'Mario', stats: { currentStreak: 2, totalStars: 200, totalBadges: 6 } };
childrenService.getChildById = async () => ({ data: child });
try { sessionStorage.setItem('childProfiles', JSON.stringify([child])); } catch { /* ignore */ }

const covers = ['big-logo.png', 'small-logo.png', 'star.png', 'stars.png'];
const video = (i, type) => ({
  _id: `${type}-${i}`,
  title: i % 2 ? 'Making a paper boat with your hands' : 'Fun with colours',
  description: 'Learn to make something wonderful together with a friend today and show it to everyone.',
  coverImage: img(covers[i % covers.length]),
  duration: 60 * (3 + i),
  videoType: type,
  isPublished: true,
  createdBy: { name: 'Teacher Anna' },
  viewCount: i * 3,
});

exploreService.getExploreContentByType = async () => ({
  success: true,
  data: [0, 1, 2, 3].map((i) => video(i, 'replay')),
  pagination: {},
});
exploreService.getAllExploreContent = async (p = {}) => ({
  success: true,
  data: [0, 1, 2, 3, 4].map((i) => video(i, p.videoType || 'cooking')),
  pagination: {},
});
exploreVideoWatchService.getVideoTypeProgress = async () => ({ success: true, data: { totalVideos: 6, viewedVideos: 2 } });
exploreVideoWatchService.getTotalStarsForVideoType = async () => ({ success: true, data: { totalStars: 40 } });
exploreVideoWatchService.getExploreVideoWatchStatus = async (id) => ({
  success: true,
  data: { isWatched: String(id).endsWith('-1'), currentWatchCount: 2 },
});

// ---- snapshot tools: record every element's box and style, to prove the computer view did not change
window.snap = async () => {
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1800));
  const props = ['display','position','fontSize','fontWeight','fontFamily','lineHeight','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','borderTopWidth','borderTopColor','boxShadow','transform','gap','flexDirection','alignItems','justifyContent','flexGrow','flexShrink','flexBasis','flexWrap','overflowX','overflowY','textAlign','textTransform','whiteSpace','minHeight','minWidth','maxWidth','zIndex','borderRadius','gridTemplateColumns','aspectRatio','width','height'];
  const out = {};
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const rec = { rect: [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10] };
    props.forEach((p) => { rec[p] = cs[p]; });
    out[path] = rec;
    [...el.children].forEach((c, i) => walk(c, `${path}>${c.tagName.toLowerCase()}:${i}`));
  };
  walk(document.getElementById('root'), 'root');
  return out;
};
window.saveSnap = async (key) => { const s = await window.snap(); localStorage.setItem(key, JSON.stringify(s)); return Object.keys(s).length; };
window.diffSnap = async (key) => {
  const before = JSON.parse(localStorage.getItem(key) || 'null');
  if (!before) return `no baseline ${key}`;
  const after = await window.snap();
  const diffs = [];
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach((k) => {
    if (!before[k]) { diffs.push(`${k} NEW`); return; }
    if (!after[k]) { diffs.push(`${k} GONE`); return; }
    Object.keys(before[k]).forEach((p) => {
      if (JSON.stringify(before[k][p]) !== JSON.stringify(after[k][p])) diffs.push(`${k} ${p}: ${JSON.stringify(before[k][p])} -> ${JSON.stringify(after[k][p])}`);
    });
  });
  return { elements: Object.keys(before).length, differences: diffs.length, sample: diffs.slice(0, 14) };
};

const Shell = ({ children }) => <ChildLayout childId="kid1">{children}</ChildLayout>;

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[route === 'videos' ? `/child/kid1/explore/videos/${params.get('type') || 'cooking'}` : '/child/kid1/explore']}>
        <Routes>
          <Route path="/child/:id/explore/videos/:videoType" element={<Shell><ChildExploreVideos childId="kid1" /></Shell>} />
          <Route path="/child/:id/explore" element={<Shell><ChildExplore childId="kid1" /></Shell>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  </Provider>
);
