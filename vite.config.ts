import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'musicTool',
        short_name: 'MT',
        theme_color: '#ffffff'
      }
    })
  ],
  resolve: {
    alias: {
      // 设置 $lib 指向 src/lib 目录
      $lib: path.resolve('./src/lib')
    }
  }
});
