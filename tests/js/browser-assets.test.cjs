const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const files=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]);

test('local browser dependencies match their recorded download checksums and fixed versions',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/vendor/browser-assets.json','utf8'));
  assert.equal(manifest.packages.length,5);
  for(const dependency of manifest.packages)assert.match(dependency.version,/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/);
  for(const asset of manifest.assets){
    const bytes=fs.readFileSync(path.join('public',asset.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
  }
});

test('authored page assets and compatibility bootstrap do not load libraries from CDNs',()=>{
  for(const file of files('resources/views').filter(file=>file.endsWith('.php')).concat(['public/config.js','public/js/config.js'])){
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source,/(?:src|href)\s*=\s*["']https:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/,file);
  }
  assert.doesNotMatch(fs.readFileSync('public/config.js','utf8'),/document\.write\([^\n]*sweetalert2/);
});

test('UI icon names used by pages and scripts are preloaded locally, including dynamic sidebar icons',()=>{
  const context={window:{},document:{baseURI:'https://example.test/titaniaronw/'},URL};
  vm.runInNewContext(fs.readFileSync('public/vendor/iconify/icons.js','utf8'),context);
  const collections=new Map(context.window.IconifyPreload.map(collection=>[collection.prefix,collection]));
  for(const file of files('resources/views').concat(files('public/js')).filter(file=>/\.(?:php|js)$/.test(file))){
    const source=fs.readFileSync(file,'utf8');
    for(const match of source.matchAll(/\b(bx|solar|mdi):([a-z0-9-]+)/g)){
      const collection=collections.get(match[1]);
      assert.ok(collection&&(collection.icons[match[2]]||collection.aliases?.[match[2]]),file+': '+match[0]);
    }
  }
  assert.equal(context.window.IconifyProviders[''].resources[0],'https://example.test/titaniaronw/vendor/iconify');
  for(const name of ['pie-chart-alt-2','group','extension','bar-chart-alt-2','run','purchase-tag','user-check','link-external'])assert.ok(collections.get('bx').icons[name]);
});

test('font stylesheets reference existing local font files',()=>{
  for(const file of ['public/vendor/fonts/play.css','public/vendor/fontawesome/css/all.min.css']){
    const css=fs.readFileSync(file,'utf8');
    for(const match of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)){
      assert.doesNotMatch(match[1],/^https?:/,file);
      assert.ok(fs.existsSync(path.resolve(path.dirname(file),match[1])),match[1]);
    }
  }
});
