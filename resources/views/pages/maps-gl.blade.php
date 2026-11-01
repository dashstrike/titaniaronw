@extends('layouts.app')

@section('title', 'Titania · GL Maps')

@push('head')
<link rel="stylesheet" href="{{ asset('css/pages/maps.css') }}?v={{ filemtime(public_path('css/pages/maps.css')) }}">

@endpush

@section('content')
    @include('partials.map-editor', [
        'mapTitle' => 'Guild League Maps',
        'maps' => [
            ['key' => 'gl_main', 'label' => 'Main', 'background' => asset('images/maps/gl-main.png')],
            ['key' => 'gl_sub', 'label' => 'Sub', 'background' => asset('images/maps/gl-sub.png')],
        ],
    ])
@endsection
