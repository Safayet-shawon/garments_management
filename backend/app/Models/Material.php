<?php

namespace App\Models;

use App\Models\Concerns\StringKey;
use Illuminate\Database\Eloquent\Model;

class Material extends Model
{
    use StringKey;

    protected $guarded = [];
    protected $casts = ['on_hand' => 'float', 'reserved' => 'float', 'reorder' => 'float', 'critical' => 'float', 'unit_cost' => 'float'];

    public function getStatusAttribute(): string
    {
        return $this->on_hand <= $this->critical ? 'Critical' : ($this->on_hand <= $this->reorder ? 'Low' : 'Healthy');
    }

    protected $appends = ['status'];
}
