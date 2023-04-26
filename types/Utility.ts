export type WithMeta<T, S> = T & {
  meta: {
    sourcesOnSubject: S[];
  };
};
