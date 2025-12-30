import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLogin from '../pages/auth/AuthLogin';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthLogin />} />
        <Route path="/login" element={<AuthLogin />} />
        {/* Add more routes here as pages are created */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

