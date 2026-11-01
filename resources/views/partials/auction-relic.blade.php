<div id="relicMessage" role="status" class="alert alert-info" hidden></div>
<form id="relicRegisterForm" class="card p-3 mb-3">
    <fieldset id="relicFields" disabled>
        <div class="row g-3 align-items-end">
            <div class="col-12 col-xl-4">
                <label for="relicPlayer" class="form-label">IGN</label>
                <select id="relicPlayer" class="form-select" required><option value="">Select IGN</option></select>
            </div>
            <div class="col-12 col-xl-5">
                <label for="relicCard" class="form-label">Relic Stat to Bid On</label>
                <select id="relicCard" class="form-select" required>
                    <option value="">Select relic stat</option>
                    @foreach(config('relic') as $item)
                    <option value="{{ $item['id'] }}" data-name="{{ $item['name'] }}" data-color="{{ $item['color'] }}" data-effect="{{ strtoupper($item['id']) }} +10" data-image="{{ asset('images/relic/icon_zhujiemian_hallows_01.webp') }}">{{ $item['name'] }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-12 col-xl-3">
                <button type="submit" id="relicRegister" class="btn btn-relic w-100 d-inline-flex align-items-center justify-content-center"><i class="fa-solid fa-address-card me-2" aria-hidden="true"></i>Register</button>
            </div>
        </div>
    </fieldset>
</form>
@include('partials.auction-ban-form', ['prefix' => 'relic'])
<section class="card mb-3">
    <div class="card-header d-flex align-items-center justify-content-between gap-2">
        <div>
            <h2 class="h5 mb-1">Relic Auction</h2>
            <p id="relicTotals" class="text-muted mb-0">Loading registrations...</p>
        </div>
        <button type="button" id="relicRefresh" class="btn btn-outline-secondary d-inline-flex align-items-center flex-shrink-0"><i class="fa-solid fa-arrows-rotate me-2" aria-hidden="true"></i>Refresh</button>
    </div>
    <div class="card-body"><div id="relicRegistrations" class="row g-3"></div></div>
</section>
