import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApiData } from '../store/slices/apiSlice';
import apiService from '../services/apiService';

const TestPage = () => {
  const dispatch = useDispatch();
  const { data, loading, error, lastFetched } = useSelector((state) => state.api);

  useEffect(() => {
    // Fetch data using Redux
    dispatch(fetchApiData());

    // Also test direct API call to verify CORS
    const testDirectCall = async () => {
      try {
        const result = await apiService.testConnection();
        console.log('Direct API call successful:', result);
      } catch (err) {
        console.error('Direct API call failed:', err);
      }
    };

    testDirectCall();
  }, [dispatch]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Rise Up Kids - Frontend Test Page</h1>
      <p>This page tests the API connection and CORS configuration.</p>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>API Status</h2>
        {loading && <p>Loading...</p>}
        {error && (
          <div style={{ color: 'red' }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
        {data && (
          <div style={{ color: 'green' }}>
            <p><strong>Success!</strong> API connection working.</p>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '3px', overflow: 'auto' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
            {lastFetched && (
              <p style={{ fontSize: '12px', color: '#666' }}>
                Last fetched: {new Date(lastFetched).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
        <h3>Instructions</h3>
        <ul>
          <li>Check the browser's Network tab to verify the API call</li>
          <li>Verify CORS headers are properly configured</li>
          <li>Check console for any errors</li>
        </ul>
      </div>
    </div>
  );
};

export default TestPage;

