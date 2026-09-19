import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':{target:'http://127.0.0.1:4340',ws:true},'/auth':'http://127.0.0.1:4340'}},build:{chunkSizeWarningLimit:850}});
