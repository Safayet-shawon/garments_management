<?php

namespace App\Models;

use App\Models\Concerns\StringKey;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use StringKey;

    protected $guarded = [];
    protected $casts = ['lines' => 'array', 'cancelled' => 'boolean', 'step' => 'integer'];
}
