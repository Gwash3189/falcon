export function command<D, P, O>(
  func: ({ dependencies, params }: { dependencies: D; params: P }) => O,
) {
  return ({ dependencies, params }: { dependencies: D; params: P }) => {
    return func({ dependencies, params });
  };
}
