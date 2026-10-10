<?php

namespace App\Models;

use App\Models\Concerns\StringKey;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use StringKey;

    protected $guarded = [];
    protected $casts = ['rating' => 'float'];
}
