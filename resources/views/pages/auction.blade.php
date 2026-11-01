@extends('layouts.app')

@section('title', 'Titania · Auction')

@push('head')
<link rel="stylesheet" href="{{ asset('css/guild-runs.css') }}?v={{ filemtime(public_path('css/guild-runs.css')) }}">


<script src="{{ asset('js/config.js') }}?v={{ filemtime(public_path('js/config.js')) }}"></script>

<script src="{{ asset('js/auction.js') }}?v={{ filemtime(public_path('js/auction.js')) }}" defer></script>
@endpush

@section('content')
@include('partials.auction', ['organizer' => true])
@endsection
