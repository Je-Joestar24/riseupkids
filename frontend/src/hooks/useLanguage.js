import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '../store/slices/languageSlice';

export const useLanguage = () => {
  const language = useSelector((state) => state.language.current);
  const dispatch = useDispatch();

  const changeLanguage = (code) => {
    dispatch(setLanguage(code));
  };

  return { language, setLanguage: changeLanguage };
};

export default useLanguage;

