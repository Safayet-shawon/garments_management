<?php

namespace App\Models\Concerns;

/** Business-code primary keys (PP-2026-001, EMP-012, p1 ...). */
trait StringKey
{
    public function getIncrementing() { return false; }
    public function getKeyType() { return 'string'; }

    /** Next id for a prefix, e.g. nextId('PO-2026-', 3) => PO-2026-019 */
    public static function nextId(string $prefix, int $pad = 3): string
    {
        $max = static::query()->where('id', 'like', $prefix.'%')->pluck('id')
            ->map(fn ($id) => (int) preg_replace('/\D/', '', substr($id, strlen($prefix))))
            ->max() ?? 0;
        return $prefix.str_pad((string) ($max + 1), $pad, '0', STR_PAD_LEFT);
    }
}
