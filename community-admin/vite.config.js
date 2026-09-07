import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import { fileURLToPath, URL } from 'node:url'

const viewDesignTags = {
  'i-affix': 'Affix',
  'i-alert': 'Alert',
  'i-anchor': 'Anchor',
  'i-anchor-link': 'AnchorLink',
  'i-auto-complete': 'AutoComplete',
  'i-avatar': 'Avatar',
  'i-back-top': 'BackTop',
  'i-badge': 'Badge',
  'i-breadcrumb': 'Breadcrumb',
  'i-breadcrumb-item': 'BreadcrumbItem',
  'i-button': 'Button',
  'i-button-group': 'ButtonGroup',
  'i-card': 'Card',
  'i-carousel': 'Carousel',
  'i-carousel-item': 'CarouselItem',
  'i-cascader': 'Cascader',
  'i-cell': 'Cell',
  'i-cell-group': 'CellGroup',
  'i-checkbox': 'Checkbox',
  'i-checkbox-group': 'CheckboxGroup',
  'i-col': 'Col',
  'i-collapse': 'Collapse',
  'i-color-picker': 'ColorPicker',
  'i-content': 'Content',
  'i-date-picker': 'DatePicker',
  'i-divider': 'Divider',
  'i-drawer': 'Drawer',
  'i-dropdown': 'Dropdown',
  'i-dropdown-item': 'DropdownItem',
  'i-dropdown-menu': 'DropdownMenu',
  'i-footer': 'Footer',
  'i-form': 'Form',
  'i-form-item': 'FormItem',
  'i-header': 'Header',
  'i-icon': 'Icon',
  'i-input': 'Input',
  'i-input-number': 'InputNumber',
  'i-layout': 'Layout',
  'i-menu': 'Menu',
  'i-menu-group': 'MenuGroup',
  'i-menu-item': 'MenuItem',
  'i-modal': 'Modal',
  'i-option': 'Option',
  'i-option-group': 'OptionGroup',
  'i-page': 'Page',
  'i-panel': 'Panel',
  'i-poptip': 'Poptip',
  'i-progress': 'Progress',
  'i-radio': 'Radio',
  'i-radio-group': 'RadioGroup',
  'i-rate': 'Rate',
  'i-row': 'Row',
  'i-scroll': 'Scroll',
  'i-select': 'Select',
  'i-sider': 'Sider',
  'i-slider': 'Slider',
  'i-spin': 'Spin',
  'i-split': 'Split',
  'i-step': 'Step',
  'i-steps': 'Steps',
  'i-submenu': 'Submenu',
  'i-table': 'Table',
  'i-tab-pane': 'TabPane',
  'i-tabs': 'Tabs',
  'i-tag': 'Tag',
  'i-time': 'Time',
  'i-time-picker': 'TimePicker',
  'i-timeline': 'Timeline',
  'i-timeline-item': 'TimelineItem',
  'i-tooltip': 'Tooltip',
  'i-transfer': 'Transfer',
  'i-tree': 'Tree',
  'i-upload': 'Upload',
  'i-list': 'List',
  'i-list-item': 'ListItem',
  'i-list-item-meta': 'ListItemMeta'
}

function viewDesignPrefixPlugin () {
  return {
    preTransformNode (element) {
      element.tag = viewDesignTags[element.tag] || element.tag
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          modules: [viewDesignPrefixPlugin()]
        }
      }
    })
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '_c': fileURLToPath(new URL('./src/components', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  build: {
    sourcemap: true
  },
  server: {
    host: true,
    port: 8080
  }
})
