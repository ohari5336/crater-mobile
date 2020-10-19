// @flow

import React from 'react';
import { View } from 'react-native';
import { Field, change } from 'redux-form';
import styles from './styles';
import {
    InputField,
    CtButton,
    DefaultLayout,
    FilePicker,
    SelectPickerField,
    DatePickerField,
} from '@/components';
import { EXPENSE_FORM, EXPENSE_ADD, EXPENSE_EDIT, EXPENSE_ACTIONS, ACTIONS_VALUE } from '../../constants';
import { goBack, MOUNT, UNMOUNT, ROUTES } from '@/navigation';
import Lng from '@/lang/i18n';
import { Linking } from 'expo';
import moment from 'moment';
import { alertMe, MAX_LENGTH } from '@/constants';
import { CATEGORY_ADD } from '@/features/settings/constants';

const IMAGE_TYPE = 'image'

export class Expense extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            attachmentReceipt: null,
            isLoading: true,
            imageUrl: null,
            newCategory: [],
            fileLoading: false,
            fileType: IMAGE_TYPE
        };
    }

    componentDidMount() {

        const {
            navigation,
            getCreateExpense,
            type,
            getEditExpense,
            getReceipt,
            locale,
        } = this.props

        if (type === EXPENSE_EDIT) {
            let id = navigation.getParam('id', null)

            getEditExpense({
                id,
                onResult: ({ media }) => {
                    media.length !== 0 ?
                        getReceipt({
                            id,
                            onResult: ({ image, type }) => {
                                this.setState({
                                    isLoading: false,
                                    imageUrl: image,
                                    fileType: type.toLowerCase()
                                })
                            }
                        }) :
                        this.setState({ isLoading: false })
                }
            })
        } else {
            getCreateExpense({
                onResult: ({ categories }) => {

                    if (typeof categories === 'undefined' || categories.length === 0) {
                        alertMe({
                            title: Lng.t("expenses.noCategories", { locale }),
                            okText: 'Add',
                            okPress: () => navigation.navigate(ROUTES.CATEGORY, {
                                type: CATEGORY_ADD,
                                onSelect: (val) => {
                                    this.setNewCategory(val)
                                }
                            }),
                            showCancel: true,
                            cancelPress: () => navigation.goBack(null)
                        })
                    }
                    else {
                        this.setState({ isLoading: false })
                    }
                }
            })
        }

        goBack(MOUNT, navigation)
    }

    componentWillUnmount() {
        this.props.clearExpense()
        goBack(UNMOUNT)
    }

    setFormField = (field, value) => {
        this.props.dispatch(change(EXPENSE_FORM, field, value));
    };

    onSubmitExpense = (value) => {
        const {
            createExpense,
            navigation,
            clearExpense,
            editExpense,
            type,
            loading
        } = this.props
        const { attachmentReceipt, fileLoading } = this.state

        if (!fileLoading && !loading) {
            type === EXPENSE_ADD ?
                createExpense({
                    params: value,
                    attachmentReceipt,
                    onResult: () => {
                        navigation.navigate(ROUTES.MAIN_EXPENSES)
                        clearExpense()
                    }
                }) :
                editExpense({
                    params: value,
                    id: navigation.getParam('id'),
                    attachmentReceipt,
                    onResult: () => {
                        navigation.navigate(ROUTES.MAIN_EXPENSES)
                        clearExpense()
                    }
                })
        }

    };

    removeExpense = () => {
        const { removeExpense, navigation, locale } = this.props

        alertMe({
            title: Lng.t("alert.title", { locale }),
            desc: Lng.t("expenses.alertDescription", { locale }),
            showCancel: true,
            okPress: () => removeExpense({
                id: navigation.getParam('id', null),
                navigation
            })
        })
    }

    onOptionSelect = (action) => {
        const { company: { unique_hash }, endpointURL, navigation } = this.props

        if (action == ACTIONS_VALUE.REMOVE) {
            this.removeExpense()
        } else if (action == ACTIONS_VALUE.DOWNLOAD) {
            const id = navigation.getParam('id')
            Linking.openURL(`${endpointURL}/expenses/${id}/receipt/${unique_hash}`)
        }
    }

    setNewCategory = (val) => {
        this.setState({
            newCategory: val,
            isLoading: false
        })
        this.setFormField('expense_category_id', val.id)
        this.setFormField('expense_date', moment())
    }

    getCategoryList = ({ name, id }) => {
        let Category = { label: name, value: id }
        return Category
    }

    BOTTOM_ACTION = (handleSubmit) => {
        const { loading, locale } = this.props
        const { fileLoading } = this.state

        return (
            <View style={styles.submitButton}>
                <CtButton
                    onPress={handleSubmit(this.onSubmitExpense)}
                    btnTitle={Lng.t("button.save", { locale })}
                    loading={loading || fileLoading}
                />
            </View>
        )
    }


    render() {

        const {
            navigation,
            handleSubmit,
            initLoading,
            categories,
            locale,
            type,
            clearExpense,
            formValues
        } = this.props;

        const { imageUrl, isLoading, newCategory, fileType } = this.state;

        let CategoriesName = []

        if (typeof categories !== 'undefined' && categories.length != 0) {
            CategoriesName = categories.map((category) => {
                return this.getCategoryList(category)
            })
        }

        if (newCategory && newCategory.length !== 0)
            CategoriesName.push(this.getCategoryList(newCategory))


        const isCreateExpense = (type === EXPENSE_ADD)

        let expenseRefs = {}
        let newCategoryLoading = !(newCategory && newCategory.length === 0)
        let loading = !newCategoryLoading ? (initLoading || isLoading) : false

        let drownDownProps = (type === EXPENSE_EDIT && !loading) ? {
            options: EXPENSE_ACTIONS(Lng, locale, imageUrl),
            onSelect: this.onOptionSelect,
            cancelButtonIndex: imageUrl ? 2 : 1,
            destructiveButtonIndex: imageUrl ? 1 : 2
        } : null

        return (
            <DefaultLayout
                headerProps={{
                    leftIconPress: () => {
                        navigation.goBack(null)
                        clearExpense()
                    },
                    title: isCreateExpense ?
                        Lng.t("header.addExpense", { locale }) :
                        Lng.t("header.editExpense", { locale }),
                    placement: "center",
                    rightIcon: isCreateExpense ? 'save' : null,
                    rightIconPress: handleSubmit(this.onSubmitExpense),
                    rightIconProps: {
                        solid: true
                    }
                }}
                bottomAction={this.BOTTOM_ACTION(handleSubmit)}
                loadingProps={{
                    is: loading
                }}
                dropdownProps={drownDownProps}
            >

                <View style={styles.bodyContainer}>

                    <Field
                        name="attachment_receipt"
                        component={FilePicker}
                        mediaType={'All'}
                        label={Lng.t("expenses.receipt", { locale })}
                        navigation={navigation}
                        onChangeCallback={(val) =>
                            this.setState({ attachmentReceipt: val })
                        }
                        imageUrl={fileType.indexOf(IMAGE_TYPE) === 0 ? imageUrl : null}
                        containerStyle={styles.filePicker}
                        fileLoading={(val) => {
                            this.setState({ fileLoading: val })
                        }}
                    />

                    {!loading && formValues.expense_date && (<Field
                        name="expense_date"
                        component={DatePickerField}
                        isRequired
                        label={Lng.t("expenses.date", { locale })}
                        icon={'calendar-alt'}
                    />)}


                    <Field
                        name="amount"
                        component={InputField}
                        isRequired
                        hint={Lng.t("expenses.amount", { locale })}
                        leftIcon={'dollar-sign'}
                        inputProps={{
                            returnKeyType: 'go',
                            keyboardType: 'numeric',
                            onSubmitEditing: () => {
                                expenseRefs.category.focus();
                            }
                        }}
                        isCurrencyInput
                        inputFieldStyle={styles.inputFieldStyle}
                    />

                    <Field
                        name="expense_category_id"
                        component={SelectPickerField}
                        isRequired
                        label={Lng.t("expenses.category", { locale })}
                        fieldIcon='align-center'
                        items={CategoriesName}
                        onChangeCallback={(val) => {
                            this.setFormField('expense_category_id', val)
                        }}
                        defaultPickerOptions={{
                            label: Lng.t("expenses.categoryPlaceholder", { locale }),
                            value: '',
                        }}
                        containerStyle={styles.selectPicker}
                        refLinkFn={(ref) => {
                            expenseRefs.category = ref;
                        }}
                        onDonePress={() => expenseRefs.notes.focus()}
                    />

                    <Field
                        name={'notes'}
                        component={InputField}
                        hint={Lng.t("expenses.notes", { locale })}
                        inputProps={{
                            returnKeyType: 'next',
                            placeholder: Lng.t("expenses.notesPlaceholder", { locale }),
                            autoCorrect: true,
                            multiline: true,
                            maxLength: MAX_LENGTH
                        }}
                        height={80}
                        autoCorrect={true}
                        refLinkFn={(ref) => {
                            expenseRefs.notes = ref;
                        }}
                    />

                </View>
            </DefaultLayout>
        );
    }
}
