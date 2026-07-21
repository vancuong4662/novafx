import { createRoot } from 'react-dom/client';
import { EditorApp } from './editor/EditorApp.jsx';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';

createRoot(document.querySelector('#app')).render(<EditorApp />);