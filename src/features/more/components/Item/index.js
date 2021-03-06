// @flow

import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles';
import { Field, change } from 'redux-form';
import {
    InputField,
    CtDivider,
    CtButton,
    DefaultLayout,
    SelectField,
    CurrencyFormat
} from '@/components';
import { ROUTES } from '@/navigation';
import { ITEM_FORM, EDIT_ITEM, ADD_ITEM } from '../../constants';
import { colors } from '@/styles/colors';
import Lng from '@/lang/i18n';
import { goBack, UNMOUNT, MOUNT } from '@/navigation';
import { BUTTON_COLOR, isIPhoneX } from '@/constants';
import { alertMe, hasValue, MAX_LENGTH } from '@/constants';
import { ADD_TAX } from '@/features/settings/constants';

export class Item extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isTaxPerItem: true,
            isLoading: true
        };
    }

    componentDidMount() {
        this.setInitialValues();
        goBack(MOUNT, this.props.navigation);
    }

    componentWillUnmount() {
        this.props.clearItem?.();
        goBack(UNMOUNT);
    }

    setInitialValues = () => {
        const { getEditItem, type, itemId, getSettingInfo } = this.props;

        if (type === ADD_ITEM) {
            getSettingInfo({
                key: 'tax_per_item',
                onSuccess: res => {
                    this.setState({
                        isTaxPerItem: res === 'YES',
                        isLoading: false
                    });
                }
            });
            return;
        }

        if (type === EDIT_ITEM) {
            getEditItem({
                id: itemId,
                onResult: () => {
                    this.setState({ isLoading: false });
                }
            });
            return;
        }
    };

    setFormField = (field, value) => {
        this.props.dispatch(change(ITEM_FORM, field, value));
    };

    saveItem = values => {
        const {
            addItem,
            editItem,
            itemId,
            navigation,
            type,
            locale
        } = this.props;

        if (this.state.isLoading) {
            return;
        }

        if (this.finalAmount() < 0) {
            alert(Lng.t('items.lessAmount', { locale }));
            return;
        }

        const item = {
            ...values,
            total: this.finalAmount(),
            tax: this.itemTax() + this.itemCompoundTax(),
            taxes:
                values.taxes &&
                values.taxes.map(val => {
                    return {
                        ...val,
                        amount: val.compound_tax
                            ? this.getCompoundTaxValue(val.percent)
                            : this.getTaxValue(val.percent)
                    };
                })
        };

        type == ADD_ITEM
            ? addItem({
                  item,
                  onResult: () => {
                      navigation.navigate(ROUTES.GLOBAL_ITEMS);
                  }
              })
            : editItem({
                  item: { ...item },
                  id: itemId,
                  onResult: () => {
                      navigation.navigate(ROUTES.GLOBAL_ITEMS);
                  }
              });
    };

    removeItem = () => {
        const { removeItem, itemId, navigation, locale } = this.props;

        if (this.state.isLoading) {
            return;
        }

        alertMe({
            title: Lng.t('alert.title', { locale }),
            desc: Lng.t('items.alertDescription', { locale }),
            showCancel: true,
            okPress: () =>
                removeItem({
                    id: itemId,
                    onResult: res => {
                        if (res.success) {
                            navigation.navigate(ROUTES.GLOBAL_ITEMS);
                            return;
                        }

                        alertMe({
                            title: Lng.t('items.alreadyAttachTitle', {
                                locale
                            }),
                            desc: Lng.t('items.alreadyAttachDescription', {
                                locale
                            })
                        });
                    }
                })
        });
    };

    totalAmount = () => {
        const {
            formValues: { price }
        } = this.props;

        return price + this.itemTax();
    };

    itemTax = () => {
        const {
            formValues: { taxes }
        } = this.props;

        let totalTax = 0;

        taxes &&
            taxes.map(val => {
                if (!val.compound_tax) {
                    totalTax += this.getTaxValue(val.percent);
                }
            });

        return totalTax;
    };

    itemCompoundTax = () => {
        const {
            formValues: { taxes }
        } = this.props;

        let totalTax = 0;

        taxes &&
            taxes.map(val => {
                if (val.compound_tax) {
                    totalTax += this.getCompoundTaxValue(val.percent);
                }
            });

        return totalTax;
    };

    getTaxValue = tax => {
        const {
            formValues: { price }
        } = this.props;
        return (tax * price) / 100;
    };

    getCompoundTaxValue = tax => {
        return (tax * JSON.parse(this.totalAmount())) / 100;
    };

    getTaxName = tax => {
        if (hasValue(tax?.name)) {
            return tax.name;
        }

        const { taxTypes } = this.props;
        let taxName = '';

        const type =
            taxTypes &&
            taxTypes.filter(val => val.fullItem.id === tax.tax_type_id);

        if (taxTypes && type.length > 0) {
            taxName = type[0]['fullItem'].name;
        }
        return taxName;
    };

    finalAmount = () => {
        return this.totalAmount() + this.itemCompoundTax();
    };

    FINAL_AMOUNT = () => {
        const {
            locale,
            formValues: { taxes, price },
            navigation
        } = this.props;

        const currency = navigation.getParam('currency');

        return (
            <View style={styles.amountContainer}>
                <View style={styles.subContainer}>
                    <View>
                        <Text style={styles.label}>
                            {Lng.t('items.subTotal', { locale })}
                        </Text>
                    </View>
                    <View>
                        <CurrencyFormat
                            amount={price}
                            currency={currency}
                            style={styles.price}
                        />
                    </View>
                </View>

                {taxes &&
                    taxes.map(val =>
                        !val.compound_tax ? (
                            <View style={styles.subContainer}>
                                <View>
                                    <Text style={styles.label}>
                                        {this.getTaxName(val)} ({val.percent} %)
                                    </Text>
                                </View>
                                <View>
                                    <CurrencyFormat
                                        amount={this.getTaxValue(val.percent)}
                                        currency={currency}
                                        style={styles.price}
                                    />
                                </View>
                            </View>
                        ) : null
                    )}

                {taxes &&
                    taxes.map(val =>
                        val.compound_tax ? (
                            <View style={styles.subContainer}>
                                <View>
                                    <Text style={styles.label}>
                                        {this.getTaxName(val)} ({val.percent} %)
                                    </Text>
                                </View>
                                <View>
                                    <CurrencyFormat
                                        amount={this.getCompoundTaxValue(
                                            val.percent
                                        )}
                                        currency={currency}
                                        style={styles.price}
                                    />
                                </View>
                            </View>
                        ) : null
                    )}

                <CtDivider dividerStyle={styles.divider} />

                <View style={styles.subContainer}>
                    <View>
                        <Text style={styles.label}>
                            {Lng.t('items.finalAmount', { locale })}
                        </Text>
                    </View>
                    <View>
                        <CurrencyFormat
                            amount={this.finalAmount()}
                            currency={currency}
                            style={styles.totalPrice}
                        />
                    </View>
                </View>
            </View>
        );
    };

    BOTTOM_ACTION = handleSubmit => {
        const { locale, loading, type } = this.props;
        const isCreateItem = type === ADD_ITEM;

        return (
            <View style={styles.submitButton}>
                <CtButton
                    onPress={handleSubmit(this.saveItem)}
                    btnTitle={Lng.t('button.save', { locale })}
                    containerStyle={styles.handleBtn}
                    buttonContainerStyle={styles.buttonContainer}
                    loading={loading}
                />
                {!isCreateItem && (
                    <CtButton
                        onPress={this.removeItem}
                        btnTitle={Lng.t('button.remove', { locale })}
                        containerStyle={styles.handleBtn}
                        buttonContainerStyle={styles.buttonContainer}
                        buttonColor={BUTTON_COLOR.DANGER}
                        loading={loading}
                    />
                )}
            </View>
        );
    };

    TAX_FIELD_VIEW = () => {
        const {
            navigation,
            locale,
            taxTypes,
            formValues: { taxes },
            getTaxes
        } = this.props;

        return (
            <Field
                name="taxes"
                items={taxTypes}
                getItems={getTaxes}
                apiSearch
                hasPagination
                displayName="name"
                label={Lng.t('items.taxes', { locale })}
                component={SelectField}
                searchFields={['name', 'percent']}
                placeholder={Lng.t('items.selectTax', { locale })}
                onlyPlaceholder
                fakeInputProps={{
                    icon: 'percent',
                    rightIcon: 'angle-right',
                    color: colors.gray
                }}
                navigation={navigation}
                isMultiSelect
                locale={locale}
                concurrentMultiSelect
                compareField="id"
                valueCompareField="tax_type_id"
                listViewProps={{
                    contentContainerStyle: { flex: 2 }
                }}
                headerProps={{
                    title: Lng.t('taxes.title', { locale })
                }}
                rightIconPress={() =>
                    navigation.navigate(ROUTES.TAX, {
                        type: ADD_TAX,
                        onSelect: val => {
                            this.setFormField('taxes', [...val, ...taxes]);
                        }
                    })
                }
                emptyContentProps={{
                    contentType: 'taxes'
                }}
            />
        );
    };

    render() {
        const {
            navigation,
            handleSubmit,
            loading,
            locale,
            type,
            units,
            formValues,
            getItemUnits
        } = this.props;
        const { isTaxPerItem, isLoading } = this.state;
        const isCreateItem = type === ADD_ITEM;
        let itemRefs = {};

        return (
            <DefaultLayout
                headerProps={{
                    leftIconPress: () =>
                        navigation.navigate(ROUTES.GLOBAL_ITEMS),
                    title: isCreateItem
                        ? Lng.t('header.addItem', { locale })
                        : Lng.t('header.editItem', { locale }),
                    placement: 'center',
                    rightIcon: 'save',
                    rightIconProps: {
                        solid: true
                    },
                    rightIconPress: handleSubmit(this.saveItem)
                }}
                bottomAction={this.BOTTOM_ACTION(handleSubmit)}
                loadingProps={{ is: isLoading }}
            >
                <View style={styles.bodyContainer}>
                    <Field
                        name="name"
                        component={InputField}
                        isRequired
                        hint={Lng.t('items.name', { locale })}
                        inputProps={{
                            returnKeyType: 'next',
                            autoCapitalize: 'none',
                            autoCorrect: true,
                            onSubmitEditing: () => {
                                itemRefs.price.focus();
                            }
                        }}
                    />

                    <Field
                        name="price"
                        component={InputField}
                        isRequired
                        hint={Lng.t('items.price', { locale })}
                        inputProps={{
                            returnKeyType: 'next',
                            autoCapitalize: 'none',
                            autoCorrect: true,
                            keyboardType: 'numeric'
                        }}
                        isCurrencyInput
                        refLinkFn={ref => {
                            itemRefs.price = ref;
                        }}
                    />

                    <Field
                        name="unit_id"
                        component={SelectField}
                        apiSearch={true}
                        hasPagination={true}
                        getItems={getItemUnits}
                        items={units}
                        displayName={'name'}
                        label={Lng.t('items.unit', { locale })}
                        icon={'balance-scale'}
                        placeholder={Lng.t('items.unitPlaceholder', { locale })}
                        navigation={navigation}
                        compareField={'id'}
                        emptyContentProps={{ contentType: 'units' }}
                        headerProps={{
                            title: Lng.t('items.unitPlaceholder', { locale })
                        }}
                        fakeInputProps={{
                            valueStyle: styles.units,
                            placeholderStyle: styles.units
                        }}
                        onSelect={item => this.setFormField('unit_id', item.id)}
                        paginationLimit={isIPhoneX() ? 20 : 15}
                        inputModalName="UnitModal"
                    />

                    {isTaxPerItem && this.TAX_FIELD_VIEW()}

                    {this.FINAL_AMOUNT()}

                    <Field
                        name="description"
                        component={InputField}
                        hint={Lng.t('items.description', { locale })}
                        inputProps={{
                            returnKeyType: 'next',
                            autoCapitalize: 'none',
                            autoCorrect: true,
                            multiline: true,
                            maxLength: MAX_LENGTH
                        }}
                        height={80}
                        refLinkFn={ref => {
                            itemRefs.description = ref;
                        }}
                    />
                </View>
            </DefaultLayout>
        );
    }
}
