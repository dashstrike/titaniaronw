@extends('layouts.app')

@section('title', 'Titania · GL Maps')

@push('head')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
<link rel="stylesheet" href="{{ asset('css/pages/maps.css') }}?v={{ filemtime(public_path('css/pages/maps.css')) }}">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
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
