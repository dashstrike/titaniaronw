<main id="auctionPage" data-organizer="{{ $organizer ? 'true' : 'false' }}">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div><h1 class="h3 mb-1">Card Auction</h1><p class="text-muted mb-0">Select your IGN and a card to register. You can register again for a different card.</p></div>
        @if($organizer)
        <a href="{{ route('titaniaauction') }}" target="_blank" rel="noopener" class="btn btn-outline-primary d-inline-flex align-items-center"><i class="fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden="true"></i>Public Registration</a>
        @endif
    </div>
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
    <section class="card p-3 mb-3">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-3"><h2 class="h5 mb-0">Registrations by Card</h2><button type="button" id="auctionRefresh" class="btn btn-outline-secondary d-inline-flex align-items-center"><i class="fa-solid fa-arrows-rotate mr-2" aria-hidden="true"></i>Refresh</button></div>
        <p id="auctionTotals" class="text-muted">Loading registrations...</p>
        <div id="auctionRegistrations" class="row g-3"></div>
    </section>
</main>
