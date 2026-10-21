<main class="col-12 mw-100 px-0" id="mapEditor">
    <div class="card mb-3">
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
                <h4 class="card-title mb-1 d-flex align-items-center gap-2"><iconify-icon icon="bx:map-alt" aria-hidden="true"></iconify-icon> {{ $mapTitle }}</h4>
                <p class="text-muted mb-0">Upload tactical icons, place them on the map, and save the layout.</p>
            </div>
            <span class="text-muted" id="mapSaveStatus">Loading maps...</span>
        </div>
        <div class="card-body map-editor-body">
            <ul class="nav nav-tabs mb-3" id="mapTabs" role="tablist">
                @foreach($maps as $index => $map)
                    <li class="nav-item" role="presentation">
                        <button class="nav-link {{ $index === 0 ? 'active' : '' }}" type="button" data-map-key="{{ $map['key'] }}">{{ $map['label'] }}</button>
                    </li>
                @endforeach
            </ul>
            <div class="map-toolbar mb-3" id="mapToolbar">
                <label class="btn btn-outline-info mb-0">
                    <iconify-icon icon="bx:image-add"></iconify-icon> Upload Map
                    <input type="file" id="mapBackgroundInput" accept="image/png,image/jpeg,image/webp" hidden>
                </label>
                <label class="btn btn-outline-primary mb-0">
                    <iconify-icon icon="bx:upload"></iconify-icon> Upload Icon
                    <input type="file" id="mapIconInput" accept="image/png,image/jpeg,image/webp" multiple hidden>
                </label>
                <div class="input-group map-label-control">
                    <input class="form-control" id="mapLabelInput" maxlength="40" placeholder="Label or number">
                    <button class="btn btn-outline-primary" id="mapAddLabel" type="button"><iconify-icon icon="bx:text"></iconify-icon> Add</button>
                </div>
                <button class="btn btn-outline-secondary" id="mapDuplicate" type="button" disabled><iconify-icon icon="bx:copy"></iconify-icon> Duplicate</button>
                <button class="btn btn-outline-danger" id="mapDelete" type="button" disabled><iconify-icon icon="bx:trash"></iconify-icon> Delete</button>
                <button class="btn btn-primary ms-auto" id="mapSave" type="button" disabled><iconify-icon icon="bx:save"></iconify-icon> Save</button>
                <button class="btn btn-outline-info" id="mapExport" type="button"><iconify-icon icon="bx:download"></iconify-icon> Export PNG</button>
            </div>

            <div class="row g-3">
                <div class="col-xl-9">
                    <div class="map-canvas-wrap" id="mapCanvasWrap">
                        <canvas id="mapCanvas" width="1024" height="1024" aria-label="Interactive tactical map"></canvas>
                        <div class="map-empty" id="mapEmpty">
                            <iconify-icon icon="bx:image-add"></iconify-icon>
                            <strong>Upload {{ $mapTitle }} image</strong>
                            <span>The image is saved together with this map layout.</span>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3">
                    <div class="card h-100 mb-0 map-properties-card">
                        <div class="card-header"><strong><iconify-icon icon="bx:slider-alt"></iconify-icon> Selected Item</strong></div>
                        <div class="card-body">
                            <label class="form-label d-flex justify-content-between" for="mapSize"><span>Size</span><span id="mapSizeValue">100 px</span></label>
                            <input class="form-range" id="mapSize" type="range" min="24" max="400" value="100" disabled>
                            <label class="form-label mt-3 d-flex justify-content-between" for="mapRotation"><span>Rotation</span><span id="mapRotationValue">0°</span></label>
                            <input class="form-range" id="mapRotation" type="range" min="-180" max="180" value="0" disabled>
                            <p class="text-muted small mt-3 mb-0">Drag an item to move it. Use Delete or arrow keys for quick editing.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>

<script>window.TITANIA_MAP_DEFINITIONS = Object.freeze(@json($maps));</script>
<script src="{{ asset('js/pages/maps.js') }}?v={{ filemtime(public_path('js/pages/maps.js')) }}"></script>
