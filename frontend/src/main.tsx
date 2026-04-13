import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router/dom'
import { Provider } from './components/ui/provider'
import { AuthProvider } from './contexts/AuthContext'
import router from './router'

createRoot(document.getElementById('root')!).render(
	<Provider>
		<AuthProvider>
			<RouterProvider router={router} />
		</AuthProvider>
	</Provider>,
)
