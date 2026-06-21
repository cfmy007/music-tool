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
        name: 'Music Tool - 乐谱笔记工具',
        short_name: 'MusicTool',
        description: '乐谱查看、笔记标注、节拍器工具',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: './logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: './logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: './logo.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: './logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
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
