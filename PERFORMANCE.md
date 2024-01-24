# Performance

We regularly run performance tests to ensure that the performance of the application is not degraded when Bugpilot is installed and your app code is instrumented.
We never instrument client-side code, so most of your components will not be affected by the instrumentation. We only instrument some server-side code.

## How to test

We use `wrk` (`brew install wrk`) to run performance tests.  
Tests are run against a bare create-next-app project with the default configuration, and Bugpilot installed using the `@bugpilot/wizard` package.

We also compare the bundle size, by looking at the output of the `next build` command.

Hardware: Tests are run on an M1 MacBook Pro with 16GB of RAM.  
Results: Below you can find the most recent results.  

```bash
wrk -t12 -c400 -d30s http://localhost:3200/
```

## Test results

### 2024-01-24

#### Without Bugpilot

Bundle Size:

```text
Route (app)                              Size     First Load JS
┌ ○ /                                    5.15 kB        89.3 kB
└ ○ /_not-found                          882 B            85 kB
+ First Load JS shared by all            84.2 kB
  ├ chunks/184-d3bb186aac44da98.js       28.9 kB
  ├ chunks/30b509c0-f3503c24f98f3936.js  53.4 kB
  └ other shared chunks (total)          1.87 kB
```

Requests throughput:

```text
Running 30s test @ http://localhost:3200/
  12 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    13.97ms   24.90ms 706.27ms   99.19%
    Req/Sec   658.97     62.39     1.51k    90.80%
  235929 requests in 30.10s, 3.49GB read
Requests/sec:   7838.08
Transfer/sec:    118.81MB
```

#### With Bugpilot

Bundle Size:

```text
Route (app)                              Size     First Load JS
┌ ○ /                                    6.33 kB        90.8 kB
└ ○ /_not-found                          924 B          85.4 kB
+ First Load JS shared by all            84.5 kB
  ├ chunks/184-9b0dc1eb0ceb8b32.js       29 kB
  ├ chunks/30b509c0-2b92d3406a54ba7e.js  53.4 kB
  └ other shared chunks (total)          2.1 kB
```

Requests throughput:

```text
Running 30s test @ http://localhost:3200/
  12 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    14.68ms   31.10ms 795.08ms   99.07%
    Req/Sec   657.55     63.79     1.83k    91.86%
  235400 requests in 30.10s, 3.72GB read
Requests/sec:   7820.41
Transfer/sec:    126.71MB
```
