export function command<D, P, O>(
  func: ({ dependencies, params }: { dependencies: D; params: P }) => O,
) {
  return (dependencies: D) => {
    return (params: P) => {
      return func({ dependencies, params });
    };
  };
}
