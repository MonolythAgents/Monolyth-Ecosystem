(async () => {
  const t0 = Date.now()

  const logStep = (name: string, start: number) => {
    const ms = Date.now() - start
    console.log(`[step] ${name} completed in ${ms}ms`)
  }

  try {
    // 1) Analyze activity
    const tA = Date.now()
    const activityAnalyzer = new TokenActivityAnalyzer("https://solana.rpc")
    const records = await activityAnalyzer.analyzeActivity("MintPubkeyHere", 20)
    logStep("activity", tA)

    // 2) Analyze depth
    const tD = Date.now()
    const depthAnalyzer = new TokenDepthAnalyzer("https://dex.api", "MarketPubkeyHere")
    const depthMetrics = await depthAnalyzer.analyze(30)
    logStep("orderbook depth", tD)

    // 3) Detect patterns
    const tP = Date.now()
    const volumes = records.map(r => r.amount).filter(v => Number.isFinite(v) && v > 0)
    const patterns = volumes.length > 0 ? detectVolumePatterns(volumes, 5, 100) : []
    logStep("volume patterns", tP)

    // 4) Execute a custom task
    const tE = Date.now()
    const engine = new ExecutionEngine()
    engine.register("report", async (params) => ({ records: params.records.length }))
    engine.enqueue("task1", "report", { records })
    const taskResults = await engine.runAll()
    logStep("task execution", tE)

    // 5) Sign the results
    const tS = Date.now()
    const signer = new SigningEngine()
    const payload = JSON.stringify({ depthMetrics, patterns, taskResults })
    const signature = await signer.sign(payload)
    const ok = await signer.verify(payload, signature)
    logStep("sign+verify", tS)

    const totalMs = Date.now() - t0
    console.log({
      totals: { records: records.length, patterns: patterns.length, runtimeMs: totalMs },
      depthMetrics,
      taskResults,
      signatureValid: ok,
    })
  } catch (err) {
    console.error("pipeline failed:", err instanceof Error ? err.message : String(err))
    process?.exit?.(1)
  }
})()
