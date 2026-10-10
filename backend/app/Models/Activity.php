<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    protected $guarded = [];

    public static function log(string $text, string $icon = 'stock', string $by = 'Safayet Shawon'): void
    {
        static::create(compact('text', 'icon', 'by'));
    }
}
