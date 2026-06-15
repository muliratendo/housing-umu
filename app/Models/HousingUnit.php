<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable; // 👈 1. Import the trait

class HousingUnit extends Model
{
    use Searchable; // 👈 2. Use the trait

    /**
     * Get the indexable data array for the model.
     * Only send data to Algolia that you actually need to search through.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
        ];
    }
}
