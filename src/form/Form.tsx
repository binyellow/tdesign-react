import React, { forwardRef, useRef, createRef, useImperativeHandle } from 'react';
import classNames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import useConfig from '../_util/useConfig';
import { TdFormProps, FormValidateResult } from '../_type/components/form';
import { StyledProps } from '../_type';
import FormContext from './FormContext';

export interface FormProps extends TdFormProps, StyledProps {
  children?: React.ReactNode;
}

export type Result = FormValidateResult<FormData>;

function isFunction(val: unknown) {
  return typeof val === 'function';
}

const Form: React.FC<TdFormProps> = forwardRef((props: FormProps, ref: React.Ref<HTMLFormElement>) => {
  const {
    className,
    labelWidth,
    statusIcon,
    labelAlign = 'right',
    layout = 'vertical',
    size = 'medium',
    colon = false,
    requiredMark = true,
    scrollToFirstError,
    showErrorMessage = true,
    resetType = 'empty',
    rules,
    children,
    onSubmit,
    onReset,
  } = props;
  const { classPrefix } = useConfig();
  const formClass = classNames(className, {
    [`${classPrefix}-form-inline`]: layout === 'inline',
    [`${classPrefix}-form`]: layout !== 'inline',
  });

  const formItemsRef = useRef([]);
  formItemsRef.current = React.Children.map(children, (_child, index) => (formItemsRef.current[index] = createRef()));

  const FORM_ITEM_CLASS_PREFIX = `${classPrefix}-form-item__`;

  function getFirstError(r: Result) {
    if (r === true) return;
    const [firstKey] = Object.keys(r);
    if (scrollToFirstError) {
      scrollTo(`.${FORM_ITEM_CLASS_PREFIX + firstKey}`);
    }
    return r[firstKey][0].message;
  }
  // 校验不通过时，滚动到第一个错误表单
  function scrollTo(selector: string) {
    const dom = document.querySelector(selector);
    const behavior = scrollToFirstError as ScrollBehavior;
    dom && dom.scrollIntoView({ behavior });
  }

  function submitHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    validate().then((r) => {
      getFirstError(r);
      onSubmit?.({ validateResult: r, e });
    });
  }
  function resetHandler(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    formItemsRef.current.forEach((formItemRef) => {
      if (!isFunction(formItemRef.resetField)) return;
      formItemRef.resetField();
    });
    onReset?.({ e });
  }

  // 对外方法，该方法会触发全部表单组件错误信息显示
  function validate(): Promise<Result> {
    const list = formItemsRef.current
      .filter((formItemRef) => isFunction(formItemRef.validate))
      .map((formItemRef) => formItemRef.validate());

    return new Promise((resolve) => {
      Promise.all(list).then((arr) => {
        const r = arr.reduce((r, err) => Object.assign(r || {}, err));
        Object.keys(r).forEach((key) => {
          if (r[key] === true) {
            delete r[key];
          }
        });
        resolve(isEmpty(r) ? true : r);
      });
    });
  }

  // 对外方法，获取对应 formItem 的值
  function getFieldValue(name) {
    if (!name) return null;
    const target = formItemsRef.current.find((formItemRef) => formItemRef.name === name);
    return target && target.value;
  }

  // 对外方法，设置对应 formItem 的值
  function setFieldsValue(fileds = {}) {
    const formItemsMap = formItemsRef.current.reduce((acc, currItem) => {
      const { name } = currItem;
      return { ...acc, [name]: currItem };
    }, {});
    Object.keys(fileds).forEach((key) => {
      formItemsMap[key].setValue(fileds[key]);
    });
  }

  useImperativeHandle(ref, (): any => ({ getFieldValue, setFieldsValue, validate }));

  return (
    <FormContext.Provider
      value={{
        labelWidth,
        statusIcon,
        labelAlign,
        layout,
        size,
        colon,
        requiredMark,
        showErrorMessage,
        scrollToFirstError,
        resetType,
        rules,
      }}
    >
      <form className={formClass} onSubmit={submitHandler} onReset={resetHandler} ref={ref}>
        {React.Children.map(children, (child: any, index) => {
          const { cloneElement } = React;
          return cloneElement(child, {
            ref: (el) => {
              if (!el) return;
              formItemsRef.current[index] = el;
            },
          });
        })}
      </form>
    </FormContext.Provider>
  );
});

export default Form;