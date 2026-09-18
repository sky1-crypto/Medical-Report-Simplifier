export function normalizeTest(test) {
  const name = test.name
    .replace(/\s+/g, " ")
    .trim();

  const value = Number(test.value);

  const unit = test.unit
    ? test.unit.trim()
    : null;

  if (Number.isNaN(value)) {
    return {
      name,
      value: test.value,
      unit,
      status: "unknown",
      ref_range: null
    };
  }

  if (
    test.ref_range &&
    typeof test.ref_range.low === "number" &&
    typeof test.ref_range.high === "number"
  ) {
    let status = "normal";

    if (value < test.ref_range.low) {
      status = "low";
    } else if (value > test.ref_range.high) {
      status = "high";
    }

    return {
      name,
      value,
      unit,
      status,
      ref_range: {
        low: test.ref_range.low,
        high: test.ref_range.high
      }
    };
  }

  if (
    test.status === "low" ||
    test.status === "normal" ||
    test.status === "high"
  ) {
    return {
      name,
      value,
      unit,
      status: test.status,
      ref_range: null
    };
  }

  return {
    name,
    value,
    unit,
    status: "unknown",
    ref_range: null
  };
}