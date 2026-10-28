# highcharts-vue-test

A static Vue 3 page that loads Highcharts from a child component. There is no bundler and no build step. nginx serves the files, the browser compiles the Vue templates, and an import map resolves `vue`, `highcharts`, and `highcharts-vue`.

Open `http://localhost/highcharts.html`.

## What the page shows

`highcharts.html` mounts one root component:

- **Hello World** and a counter. Increment updates both.
- `Dog`, a local child component. It receives `dogname="Stinker"`.
- `TestChart`, a local child component. It owns a line chart and the sample data. Nothing is passed in as props.

`Dog` is only here to show the same component pattern without Highcharts: a named export, a relative import, and a local `components` entry.

## Files

```
highcharts.html                 page, import map, root component
components/Dog.js               named export Dog
components/TestChart.js         named export TestChart; imports highcharts-vue
```

Child components are not in the import map. The map is only for the shared libraries.

## Import map

The map is an inline script in `highcharts.html`, before the module script. It applies to every module that page loads, including `components/TestChart.js`.

```html
<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js",
      "highcharts": "https://cdn.jsdelivr.net/npm/highcharts@12.6.2/esm/highcharts.js",
      "highcharts-vue": "https://esm.sh/highcharts-vue@2.0.1?external=vue,highcharts"
    }
  }
</script>
```

| Specifier | URL | Why this URL |
| --- | --- | --- |
| `vue` | `vue.esm-browser.js` | Full build. It includes the template compiler, which the page and the child components need because their templates are strings. |
| `highcharts` | `highcharts/esm/highcharts.js` | Single-file browser ESM build. It has a default export, which is what `highcharts-vue` imports. |
| `highcharts-vue` | esm.sh with `?external=vue,highcharts` | The published npm package is not browser ESM. This URL is. `external` keeps its `vue` and `highcharts` imports as bare specifiers so they hit this same map. |

The page then imports with bare specifiers:

```js
import { createApp, ref } from 'vue'
```

`TestChart.js` uses the same names:

```js
import { ref } from 'vue'
import { Chart } from 'highcharts-vue'
```

Those two `vue` imports are the same module. `Chart` is created with `h()` from that module, and `createApp` is from that module. One Vue instance owns the whole tree.

## Why a child component is the part the docs skip

Highcharts Vue documents this:

```js
import { Chart } from 'highcharts-vue'
```

That line works in Webpack or Vite because the bundler resolves the package and deduplicates `vue`. This page has no bundler. `TestChart.js` is loaded by the browser as its own module, and that module still contains the bare specifier `highcharts-vue`. The browser resolves it only through the document import map.

The same is true inside `highcharts-vue` itself. After esm.sh converts the package, its module starts with:

```js
import * as __0$ from "highcharts"
import * as __1$ from "vue"
```

Those specifiers are resolved by the page import map, not by the location of `TestChart.js` and not by esm.sh. That is why the map has to exist on the HTML page even though the chart import lives in the child.

`?external=vue,highcharts` is required. Without it, the CDN build inlines its own copy of Vue. `Chart` then calls `h()` from that copy, while the page called `createApp` from `vue.esm-browser.js`. The vnode is created by a different Vue than the one rendering the app, and the chart does not mount.

## URLs that look right and do not work

These are the paths the package and the docs suggest. They fail in a browser module graph:

- `highcharts-vue/dist/highcharts-vue.min.js` is a UMD bundle. It calls `require("highcharts")` and `require("vue")`. A browser `import` cannot execute that.
- `highcharts-vue/src/index.js` is ESM, but it imports `./component` with no file extension. Browsers reject extensionless relative imports.
- `https://code.highcharts.com/esm/highcharts.js` is the URL in the Highcharts ESM docs. `highcharts-vue` does not import that URL. It imports the bare name `highcharts`. The import map has to supply that name. This project points it at the npm `esm/highcharts.js` build, which is one file and default-exports the library.
- Putting `components/TestChart.js` in the import map is unnecessary. Child files are imported by relative path, with the `.js` extension:

```js
import { TestChart } from './components/TestChart.js'
import { Dog } from './components/Dog.js'
```

## Register the chart where it is used

`Chart` is not installed with `app.use` and it is not registered on the root. `TestChart` registers it locally and passes options from its own `setup()`:

```js
export const TestChart = {
  components: {
    Chart
  },
  setup() {
    const chartOptions = ref({
      chart: { type: 'line' },
      title: { text: 'Hello World' },
      xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      series: [{ name: 'Hello World', data: [1, 3, 2, 4, 6, 5] }]
    })
    return { chartOptions }
  },
  template: `<Chart :options="chartOptions"></Chart>`
}
```

The root registers `TestChart` the same way, as a local component, then renders `<TestChart>` inside `#future-work`. `app` is kept as a `const` so a later `app.use(...)` can be added before `app.mount('#app')`. This chart does not need that.

## Module graph

```
highcharts.html
  import map
    vue            -> vue.esm-browser.js
    highcharts     -> highcharts/esm/highcharts.js
    highcharts-vue -> esm.sh ?external=vue,highcharts
  import { createApp, ref } from 'vue'
  import { Dog } from './components/Dog.js'
  import { TestChart } from './components/TestChart.js'
        import { ref } from 'vue'                  same map entry
        import { Chart } from 'highcharts-vue'
              import 'highcharts'                  same map entry
              import 'vue'                          same map entry
```
