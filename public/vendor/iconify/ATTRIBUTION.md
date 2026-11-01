The bundled UI icons are distributed through Iconify. Only the icons listed in
sources.json are included; SVG geometry is unchanged.

- Material Design Icons by [Pictogrammers](https://github.com/Templarian/MaterialDesign),
  licensed under [Apache 2.0](https://github.com/Templarian/MaterialDesign/blob/master/LICENSE).
- BoxIcons v2 by [Boxicons](https://github.com/box-icons/boxicons),
  licensed under [MIT](https://github.com/box-icons/boxicons/blob/main/LICENSE).
- Solar icons by [480 Design](https://www.figma.com/community/file/1166831539721848736),
  licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

icons.js preloads these collections and directs any fallback lookup to this
local directory. Add new icons to both the matching JSON collection and preload.
