# Performance Standards

Performance must be designed into the feature when latency, throughput, scale, cost, or user interaction quality matters.

## Define Budgets

Each performance-sensitive feature should define budgets:

| Area | Example Budget |
| --- | --- |
| API latency | p95 under 300 ms for cached reads. |
| Page interaction | Visible response within 100 ms for local interactions. |
| Page load | Product-defined web vital or route budget. |
| Job processing | Complete within agreed SLA. |
| AI response | First token or structured response within product expectation. |
| Cost | External API/model/provider cost per operation bounded. |

## Backend Performance

- Avoid unbounded queries.
- Add indexes for new query patterns.
- Paginate large result sets.
- Batch external calls where safe.
- Cache stable expensive reads with invalidation strategy.
- Use queues for slow side effects.
- Set timeouts for external calls.
- Use streaming only when it improves user or system behavior.

## Frontend Performance

- Avoid loading unnecessary code on initial route.
- Use optimized images and media.
- Avoid layout thrash and excessive re-rendering.
- Use virtualization for large lists.
- Debounce or throttle high-frequency interactions.
- Preserve responsiveness during async work.

## AI Performance And Cost

AI features must define:

- Model selection rationale.
- Token budget.
- Retrieval limit.
- Timeout behavior.
- Fallback behavior.
- Cache strategy when safe.
- Cost monitoring metric.

Do not send large context blindly. Retrieve, rank, trim, and cite only necessary context.

## Database Performance

Review:

- Query plans for new complex queries.
- N+1 behavior.
- Index selectivity.
- Locking and transaction duration.
- Migration runtime and rollback.
- Hot partitions or tenant skew.

## Performance Testing

Use the lightest test that proves the risk:

- Unit benchmark for hot pure functions.
- Integration measurement for queries.
- Load test for throughput or concurrency.
- Browser performance trace for client interactions.
- Synthetic test for external dependency timeout behavior.

## Observability For Performance

Emit:

- Latency metrics.
- Error and timeout metrics.
- Queue depth and job duration.
- Cache hit rate where caching is introduced.
- External provider cost and latency where relevant.

## Done Means

- Budgets are defined for performance-sensitive work.
- Implementation meets budgets or documented trade-offs.
- Expensive paths are bounded.
- Performance signals exist in production.

