import { expect } from "chai";

suite("executor", function () {
  this.timeout(20000);

  const executor = (global as any).__executor__;
  setup(() => executor.allSettled());
  teardown(() => executor.allSettled());

  suite("no processes", () => {
    test("count is zero", () => {
      expect(executor.count).to.equal(0);
    });

    test("onSettled is immediate", () => {
      let invoked = false;
      executor.onSettled(() => (invoked = true));
      expect(invoked).to.be.true;
    });
  });

  suite("active process", () => {
    test("count is non-zero", async () => {
      const task = async () => await sleep(50);
      const promise = executor.start(task);

      expect(executor.count).to.equal(1);
      await promise;
      await sleep(1);
      expect(executor.count).to.equal(0);
    });

    test("onSettled waits", async () => {
      let invoked = false;
      const task = async () => await sleep(50);
      const promise = executor.start(task);

      executor.onSettled(() => (invoked = true));
      expect(invoked).to.be.false;
      await promise;
      await sleep(1);
      expect(invoked).to.be.true;
    });

    test("allSettled waits", async () => {
      let invoked = false;
      const task = async () => {
        await sleep(50);
        invoked = true;
      };
      executor.start(task);

      expect(invoked).to.be.false;
      await executor.allSettled();
      expect(invoked).to.be.true;
    });
  });
});

async function sleep(timeout: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}
