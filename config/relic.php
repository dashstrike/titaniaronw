<?php

$stats = [
    ['id' => 'str', 'name' => 'STR Relic', 'color' => 'danger'],
    ['id' => 'agi', 'name' => 'AGI Relic', 'color' => 'warning'],
    ['id' => 'vit', 'name' => 'VIT Relic', 'color' => 'success'],
    ['id' => 'dex', 'name' => 'DEX Relic', 'color' => 'orange'],
    ['id' => 'int', 'name' => 'INT Relic', 'color' => 'info'],
    ['id' => 'luk', 'name' => 'LUK Relic', 'color' => 'purple'],
];

$items = [];
foreach (['bane' => 'Bane', 'guard' => 'Guard'] as $type => $label) {
    foreach ($stats as $stat) {
        $items[] = [
            'id' => $type.'_'.$stat['id'],
            'stat' => $stat['id'],
            'type' => $type,
            'image' => 'images/relic/'.$type.'-cutout.png',
            'name' => $stat['name'].' ('.$label.')',
            'color' => $stat['color'],
        ];
    }
}

return $items;
