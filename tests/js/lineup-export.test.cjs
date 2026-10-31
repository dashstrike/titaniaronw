const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/js/pages/index.js','utf8');

test('export and import preserve custom Siege raid groupings',async()=>{
  let exportedBlob;
  const context={
    Blob,
    URL:{createObjectURL(blob){exportedBlob=blob;return 'blob:test';},revokeObjectURL(){}},
    document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},
    showToast(){},stringValue:value=>String(value??''),
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const CONFIG'),source.indexOf('  let state =')),context);
  vm.runInContext(source.slice(source.indexOf('  function createDefaultRaidLeaders('),source.indexOf('  function rebuildIndex(')),context);
  vm.runInContext(source.slice(source.indexOf('  function exportLineup('),source.indexOf('  function importLineupFile(')),context);
  vm.runInContext(`
    state=normalizeClientState({});
    const moved=state.siegeRaidGroups.siege_raid_1.shift();
    state.siegeRaidGroups.siege_raid_2.push(moved);
    exportLineup();
  `,context);
  const payload=JSON.parse(await exportedBlob.text());
  const expected=JSON.parse(vm.runInContext('JSON.stringify(state.siegeRaidGroups)',context));
  const imported=context.normalizeClientState(payload);
  assert.deepEqual(JSON.parse(JSON.stringify(imported.siegeRaidGroups)),expected);

  // Backups from before this field was exported still load with default groups.
  delete payload.siegeRaidGroups;
  const legacy=context.normalizeClientState(payload);
  const defaults=JSON.parse(JSON.stringify(context.createDefaultSiegeRaidGroups()));
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.siegeRaidGroups)),defaults);
});
