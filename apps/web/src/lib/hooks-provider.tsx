// Re-export React hooks and types with proper typing for Next.js compatibility
"use client";

import React from "react";

// Export default React
export default React;

// Export React types
export type ReactNode = React.ReactNode;
export type ReactElement = React.ReactElement;
export type FC<P = {}> = React.FC<P>;
export type PropsWithChildren<P = {}> = React.PropsWithChildren<P>;
export type FormEvent<T = Element> = React.FormEvent<T>;
export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
export type MouseEvent<T = Element> = React.MouseEvent<T>;
export type TouchEvent<T = Element> = React.TouchEvent<T>;
export type KeyboardEvent<T = Element> = React.KeyboardEvent<T>;
export type SVGProps<T = SVGSVGElement> = React.SVGProps<T>;
export type HTMLAttributes<T = Element> = React.HTMLAttributes<T>;
export type ElementRef<T> = React.ElementRef<T>;
export type ComponentPropsWithoutRef<T> = React.ComponentPropsWithoutRef<T>;
export type ComponentProps<T> = React.ComponentProps<T>;
export type ComponentType<P = {}> = React.ComponentType<P>;
export type ForwardRefExoticComponent<P> = React.ForwardRefExoticComponent<P>;
export type RefAttributes<T> = React.RefAttributes<T>;
export type CSSProperties = React.CSSProperties;
export type ForwardedRef<T> = React.ForwardedRef<T>;
export type Ref<T> = React.Ref<T>;

// Export React methods
export const forwardRef = React.forwardRef;
export const createContext = React.createContext;

// Export React hooks with proper typing
export const useState = React.useState;
export const useEffect = React.useEffect;
export const useCallback = React.useCallback;
export const useMemo = React.useMemo;
export const useRef = React.useRef;
export const useContext = React.useContext;
export const useReducer = React.useReducer;
export const useLayoutEffect = React.useLayoutEffect;
export const useImperativeHandle = React.useImperativeHandle;
export const useDebugValue = React.useDebugValue;
export const useId = React.useId;

// Optional: Export a hooks object with all hooks
export const Hooks = {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
};
