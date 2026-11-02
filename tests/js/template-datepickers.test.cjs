const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(directory,item.name)):[path.join(directory,item.name)]);}
test('application templates and scripts never request native date/time pickers',()=>{
  const offenders=[];
  for(const file of [...files('resources/views'),...files('public/js')].filter(file=>!file.endsWith('.min.js'))){
    const text=fs.readFileSync(file,'utf8');
    if(/<input\b[^>]*\btype\s*=\s*["'](?:date|datetime-local|time|month|week)["']/i.test(text)||/\.type\s*=\s*["'](?:date|datetime-local|time|month|week)["']/.test(text)||/\.showPicker\(/.test(text))offenders.push(file);
  }
  assert.deepEqual(offenders,[]);
});
test('specialized Battle Stats date restrictions and Auction time format remain intact',()=>{
  const pvp=fs.readFileSync('public/js/pvp-data.js','utf8'),auction=fs.readFileSync('public/js/auction.js','utf8');
  assert.match(pvp,/enable:\[date=>\[2,4\]\.includes\(date.getDay\(\)\)\]/);
  assert.match(pvp,/availableDates\.has/);assert.match(pvp,/disableMobile:true/);
  assert.match(auction,/enableTime:true,dateFormat:'Y-m-d H:i'/);assert.match(auction,/time_24hr:true,disableMobile:true/);
});
