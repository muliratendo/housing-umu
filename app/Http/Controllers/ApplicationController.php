<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function create(Request $request): Response
    {
        // Get context from query
        $hostelId = $request->query('hostel_id');
        $hostelSlug = $request->query('hostel_slug');
        $roomId = $request->query('room_id');
        $roomType = $request->query('room_type');

        // Optionally load the hostel/room models for validation or extra display
        // $hostel = Hostel::where('slug', $hostelSlug)->first();
        // $room = Room::find($roomId);

        return Inertia::render('Student/Applications/Create', [
            'context' => [
                'hostel_id' => $hostelId,
                'hostel_slug' => $hostelSlug,
                'room_id' => $roomId,
                'room_type' => $roomType,
            ],
            // you can also pass hydrated hostel/room objects if needed
        ]);
    }
}
