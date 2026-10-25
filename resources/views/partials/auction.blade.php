<main id="auctionPage" data-organizer="{{ $organizer ? 'true' : 'false' }}">
    <div class="row g-2 align-items-center mb-3">
        <div class="col"><h1 class="h3 mb-0">Auction</h1></div>
        @if($organizer)
        <div class="col-12 col-md-auto order-3 order-md-1">
            <a href="{{ route('titaniaauction') }}" target="_blank" rel="noopener" class="btn btn-outline-primary d-inline-flex align-items-center"><i class="fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden="true"></i>Public Registration</a>
        </div>
        @endif
        <div class="col-auto order-1 order-md-2">
            <button type="button" class="btn btn-outline-warning p-2 lh-1 d-inline-flex align-items-center justify-content-center" data-bs-toggle="modal" data-bs-target="#auctionDuckInfo" aria-label="How do the ducks work?" title="How do the ducks work?"><span id="auctionDuckWiggle" class="d-inline-flex" aria-hidden="true"><iconify-icon icon="mdi:duck" class="fs-28"></iconify-icon></span></button>
        </div>
        <div class="col-12 order-2 order-md-3"><p class="text-muted mb-0">Select your IGN and an item to register. You can register again for a different item.</p></div>
    </div>
    <ul class="nav nav-underline nav-justified border-bottom mb-3" role="tablist" aria-label="Auction categories">
        <li class="nav-item" role="presentation"><button class="nav-link active text-primary w-100 d-flex align-items-center justify-content-center" id="auctionCardTab" data-bs-toggle="tab" data-bs-target="#auctionCardPane" type="button" role="tab" aria-controls="auctionCardPane" aria-selected="true"><i class="fa-regular fa-id-badge me-2" aria-hidden="true"></i>CARD</button></li>
        <li class="nav-item" role="presentation"><button class="nav-link text-danger w-100 d-flex align-items-center justify-content-center" id="auctionAccessoryTab" data-bs-toggle="tab" data-bs-target="#auctionAccessoryPane" type="button" role="tab" aria-controls="auctionAccessoryPane" aria-selected="false"><i class="fa-solid fa-ring me-2" aria-hidden="true"></i>ACCESSORY</button></li>
        <li class="nav-item" role="presentation"><button class="nav-link text-warning w-100 d-flex align-items-center justify-content-center" id="auctionRelicTab" data-bs-toggle="tab" data-bs-target="#auctionRelicPane" type="button" role="tab" aria-controls="auctionRelicPane" aria-selected="false"><i class="fa-solid fa-shield-halved me-2" aria-hidden="true"></i>RELIC</button></li>
    </ul>
    <div class="tab-content">
    <div class="tab-pane fade show active" id="auctionCardPane" role="tabpanel" aria-labelledby="auctionCardTab" tabindex="0">
    <div id="auctionMessage" role="status" class="alert alert-info" hidden></div>
    <form id="auctionRegisterForm" class="card p-3 mb-3">
        <fieldset id="auctionFields" disabled>
            <div class="row g-3 align-items-end">
                <div class="col-12 col-xl-4">
                    <label for="auctionPlayer" class="form-label">IGN</label>
                    <select id="auctionPlayer" class="form-select" required><option value="">Select IGN</option></select>
                </div>
                <div class="col-12 col-xl-5">
                    <label for="auctionCard" class="form-label">Card to Bid On</label>
                    <select id="auctionCard" class="form-select" required>
                        <option value="">Select card</option>
                        @foreach(config('auction.cards') as $card)
                        <option value="{{ $card['id'] }}" data-name="{{ $card['name'] }}" data-effect="{{ $card['effect'] }}" data-image="{{ asset('images/cards/icon_item_card_'.$card['id'].'_01.webp') }}">{{ $card['name'] }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-12 col-xl-3">
                    <button type="submit" id="auctionRegister" class="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center"><i class="fa-solid fa-address-card mr-2" aria-hidden="true"></i>Register</button>
                </div>
            </div>
        </fieldset>
    </form>
    <section class="card mb-3">
        <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <div>
                <h2 class="h5 mb-1">Card Auction</h2>
                <p id="auctionTotals" class="text-muted mb-0">Loading registrations...</p>
            </div>
            <button type="button" id="auctionRefresh" class="btn btn-outline-secondary d-inline-flex align-items-center flex-shrink-0"><i class="fa-solid fa-arrows-rotate me-2" aria-hidden="true"></i>Refresh</button>
        </div>
        <div class="card-body">
            <div id="auctionRegistrations" class="row g-3"></div>
        </div>
    </section>
    </div>
    <div class="tab-pane fade" id="auctionAccessoryPane" role="tabpanel" aria-labelledby="auctionAccessoryTab" tabindex="0">
        @include('partials.auction-accessory')
    </div>
    <div class="tab-pane fade" id="auctionRelicPane" role="tabpanel" aria-labelledby="auctionRelicTab" tabindex="0">
        <div class="card p-3"><p class="text-muted mb-0">Coming soon...</p></div>
    </div>
    </div>
</main>
@push('modals')
@include('partials.auction-duck-info')
@endpush
