import { createBrowserRouter, Navigate } from 'react-router';
import App from '../App';
import { ProtectedRoute } from '../components/app/ProtectedRoute';
import { LoginPage } from '../Pages/LoginPage';
import { RegisterPage } from '../Pages/RegisterPage';
import { ProfilePage } from '../Pages/ProfilePage';
import HomePage from '../Pages/HomePage';
import CollectionsPage from '../Pages/CollectionsPage';
import SingleCollectionPage from '../Pages/SingleCollectionPage';
import { CollectionTestPage } from '../Pages/CollectionTestPage';
import CollectionMatchPage from '../Pages/CollectionMatchPage';
import { CollectionSentencesPage } from '../Pages/CollectionSentencesPage';
import { AudioLessonPage } from '../Pages/AudioLessonPage';
import { TestAudioPage } from '../Pages/TestAudioPage';

const router = createBrowserRouter([
  // Public routes (no sidebar layout)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Protected routes (with App layout + sidebar)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: '/test_audio', element: <TestAudioPage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'collections/:id', element: <SingleCollectionPage /> },
      { path: 'collections/:id/tests', element: <CollectionTestPage /> },
      { path: 'collections/:id/match', element: <CollectionMatchPage /> },
      { path: 'collections/:id/sentences', element: <CollectionSentencesPage /> },
      { path: 'collections/:id/audio_lesson', element: <AudioLessonPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;