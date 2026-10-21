@extends('layouts.app')

@section('title', 'Titania · Siege Maps')

@push('head')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
<link rel="stylesheet" href="{{ asset('css/pages/maps.css') }}?v={{ filemtime(public_path('css/pages/maps.css')) }}">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
@endpush

@section('content')
    @include('partials.map-editor', [
        'mapTitle' => 'Siege Maps',
        'maps' => [
            ['key' => 'siege_outer', 'label' => 'Outer', 'background' => asset('images/maps/siege-outer.png')],
            ['key' => 'siege_inner', 'label' => 'Inner', 'background' => asset('images/maps/siege-inner.png')],
            ['key' => 'siege_emp_room', 'label' => 'Emp Room', 'background' => asset('images/maps/siege-emp-room.png')],
        ],
    ])
@endsection
