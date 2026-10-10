<?php

namespace App\Models;

use App\Models\Concerns\StringKey;
use Illuminate\Database\Eloquent\Model;

class ProductionPlan extends Model
{
    use StringKey;

    protected $guarded = [];
    protected $casts = ['qc_reasons' => 'array', 'cutting_started' => 'boolean', 'sewing_started' => 'boolean', 'mat_issued' => 'boolean'];
}
