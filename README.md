# Day Night Toggle · 日夜开关

一个原生 Web Component。点击后，太阳和月球沿山脊升落，湖景在日光和夜色之间过渡。夜晚的星星各自按照随机间隔闪烁。

双击 `demo.html` 可离线打开演示。

## 使用

将 `day-night-toggle.js` 和 `assets/` 复制到同一个目录。在页面里加载脚本，再插入标签。适用于原生 HTML，也可以在使用框架的页面中当作自定义 HTML 元素。

```html
<script src="./day-night-toggle.js" defer></script>

<day-night-toggle id="theme-toggle" label="白天模式"></day-night-toggle>
```

默认是黑夜。添加 `day` 属性可从白天开始，添加 `disabled` 属性可禁用按钮。两个属性都是布尔属性，移除它们即可关闭相应状态。组件支持键盘和系统的“减少动态效果”设置。

## 状态与事件

| 接口 | 用途 |
| --- | --- |
| `day` HTML / JavaScript 属性 | 读取或设置白天状态，JavaScript 中使用 `toggle.day = true` |
| `disabled` HTML / JavaScript 属性 | 禁用或启用，JavaScript 中使用 `toggle.disabled = true` |
| `label` HTML 属性 | 设置无障碍名称，默认为 `Day mode` |
| `change` 事件 | 用户切换时冒泡，`event.detail.day` 为新的布尔状态 |

```js
const toggle = document.querySelector('#theme-toggle');
toggle.addEventListener('change', (event) => {
  document.documentElement.dataset.theme = event.detail.day ? 'day' : 'night';
});
```

直接设置 `toggle.day` 会更新画面和无障碍状态。页面主题可由调用方通过上面的事件自行同步。

## 样式

`--day-night-toggle-width` 控制宽度，默认 `24rem`，随容器缩窄。组件按 2.5∶1 的比例显示场景。可用 `--day-night-toggle-focus` 更改键盘焦点样式的颜色，或通过 `::part(button)` 设置按钮的外观。

```css
day-night-toggle {
  --day-night-toggle-width: 18rem;
}
```

## 素材

- `assets/alpine-lake.webp` 由 ImageGen 生成，夜景在同一张图上调色。
- `assets/sun-sdo.webp` 使用 NASA Solar Dynamics Observatory 的 HMI 观测影像。 [NASA SDO 数据](https://sdo.gsfc.nasa.gov/data/)
- `assets/moon-nasa.webp` 使用 Scott Hull 为 NASA 提供的月球照片。 [NASA 月球摄影指南](https://science.nasa.gov/moon/photography-guide/)

<details>
<summary>湖景的 ImageGen 提示词</summary>

Use case: photorealistic-natural. Create a photorealistic landscape photograph for a day/night toggle button background. One continuous extra-wide horizontal panorama, approx 2.5:1 if available. Low eye-level view across a still Canadian alpine lake, with distant rugged low mountains, conifer woodland on the shoreline and understated natural reflections in the water. Quiet early morning, clear cool blue air near the top, hints of warm pale apricot haze at the horizon, two or three thin wisps of high cloud. Restrained photographic color, real rock and pine texture, natural atmospheric perspective. Composition is crucial: sky takes up the upper ~62% of the horizontal image, mountain peaks rise only to ~52% down, the lake takes the bottom ~23%; leave the middle of the sky wide open to composite a moving sun and moon. No steep peaks extending into the top half of the composition. Do not include a sun, moon, stars, circular flare, text, border, graphics, people, buildings or boats. The bright part of the sky is near the distant horizon. Single landscape photograph, not a collage or a mockup.

</details>

## Rust 桌面程序

使用 Rust 和 egui 构建原生桌面窗口。安装 Rust 后，在仓库目录运行：

```sh
cargo run --release --manifest-path desktop/Cargo.toml
```

程序内嵌湖景、太阳和月球素材。点击按钮切换日夜。

在线演示：[打开日夜切换页面](https://addyyaa.github.io/day-night-toggle/demo.html)
