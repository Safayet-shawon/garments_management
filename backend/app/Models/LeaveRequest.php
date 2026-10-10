<?php

namespace App\Models;

use App\Models\Concerns\StringKey;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use StringKey;

    protected $guarded = [];

}
