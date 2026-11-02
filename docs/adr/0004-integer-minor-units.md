# Money is stored as integer minor units

Context: a budget app that drifts by a cent is worse than no budget app, and
floating-point dollars drift. We decided every amount is stored as an integer
count of the currency's minor unit (cents for USD), with the currency code and
minor-unit exponent kept once in settings. All arithmetic happens on integers;
formatting to a decimal string happens only at the display edge. The ledger is
single-currency by vision, so no per-entry currency field exists.

Consequences: inputs must parse decimal strings to minor units in exactly one
place; division (e.g. splitting a bill) is the only operation that can lose
precision and must round explicitly; changing currency later is a data
migration, which is acceptable because the vision forbids multi-currency.

Status: accepted
