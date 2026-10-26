<div id="accessoryMessage" role="status" class="alert alert-info" hidden></div>
<form id="accessoryRegisterForm" class="card p-3 mb-3">
    <fieldset id="accessoryFields" disabled>
        <div class="row g-3 align-items-end">
            <div class="col-12 col-xl-4">
                <label for="accessoryPlayer" class="form-label">IGN</label>
                <select id="accessoryPlayer" class="form-select" required><option value="">Select IGN</option></select>
            </div>
            <div class="col-12 col-xl-5">
                <label for="accessoryCard" class="form-label">Accessory to Bid On</label>
                <select id="accessoryCard" class="form-select" required>
                    <option value="">Select accessory</option>
                    @foreach(config('accessory') as $item)
                    <option value="{{ $item['id'] }}" data-name="{{ $item['name'] }}" data-effect="{{ implode(' · ', $item['attributes']) }}" data-image="{{ asset($item['image']) }}">{{ $item['name'] }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-12 col-xl-3">
                <button type="submit" id="accessoryRegister" class="btn btn-danger w-100 d-inline-flex align-items-center justify-content-center"><i class="fa-solid fa-address-card me-2" aria-hidden="true"></i>Register</button>
            </div>
        </div>
    </fieldset>
</form>
@include('partials.auction-ban-form', ['prefix' => 'accessory'])
<section class="card mb-3">
    <div class="card-header d-flex align-items-center justify-content-between gap-2">
        <div>
            <h2 class="h5 mb-1">Accessory Auction</h2>
            <p id="accessoryTotals" class="text-muted mb-0">Loading registrations...</p>
        </div>
        <button type="button" id="accessoryRefresh" class="btn btn-outline-secondary d-inline-flex align-items-center flex-shrink-0"><i class="fa-solid fa-arrows-rotate me-2" aria-hidden="true"></i>Refresh</button>
    </div>
    <div class="card-body">
        <div id="accessoryRegistrations" class="row g-3"></div>
    </div>
</section>
@foreach(config('accessory') as $item)
<template id="accessoryDetails-{{ $item['id'] }}">
    <div class="text-start">
        <p class="text-muted mb-2">{{ $item['type'] }} · Level {{ $item['level'] }}</p>
        <strong class="d-block mb-2">Base Attributes</strong>
        @foreach(array_merge($item['attributes'], $item['effects']) as $line)
        <div class="mb-1">{{ $line }}</div>
        @endforeach
        @foreach($item['sets'] as $set)
        <strong class="d-block text-info mt-3 mb-2">{{ $set['name'] }} (0/{{ count($set['pieces']) }})</strong>
        @foreach($set['pieces'] as $piece)
        <div class="text-success mb-1">{{ $piece }}</div>
        @endforeach
        @foreach($set['effects'] as $effect)
        <strong class="d-block mt-2 mb-1">[{{ $effect['count'] }}] Set Effect</strong>
        <div>{{ $effect['description'] }}</div>
        @endforeach
        @endforeach
    </div>
</template>
@endforeach
